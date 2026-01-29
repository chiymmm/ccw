// ==========================================
// Unified API Module & Memory Manager
// ==========================================

class MemoryManager {
    static getGlobalContext() {
        const context = {
            recentChats: [],
            recentPosts: [],
            userStatus: 'online',
            time: new Date().toLocaleString(),
            weather: '晴朗', // Mock or API
            characterStatus: {} // {charId: {status: 'sleeping', lastActive: timestamp}}
        };

        try {
            // 1. QQ Chats (Last 5 messages from active chats)
            const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
            if (qqData.messages) {
                Object.values(qqData.messages).forEach(msgs => {
                    const recent = msgs.slice(-2);
                    recent.forEach(m => {
                        context.recentChats.push(`[QQ] ${m.senderName}: ${m.content}`);
                    });
                });
            }

            // 2. Twitter Posts (Last 3)
            const twitterData = JSON.parse(localStorage.getItem('twitter_data') || '{}');
            if (twitterData.tweets) {
                twitterData.tweets.slice(0, 3).forEach(t => {
                    context.recentPosts.push(`[Twitter] ${t.aiName || 'User'}: ${t.text}`);
                });
            }

            // 3. Instagram Posts (Last 3)
            const instaData = JSON.parse(localStorage.getItem('instagram_data') || '{}');
            if (instaData.posts) {
                instaData.posts.slice(0, 3).forEach(p => {
                    context.recentPosts.push(`[Ins] ${p.username}: ${p.caption}`);
                });
            }
            
            // 4. Couple Status
            const coupleData = JSON.parse(localStorage.getItem('couple_data') || '{}');
            if(coupleData.currentPartnerId) {
                context.relationship = `与 ${coupleData.currentPartnerId} 恋爱中`;
            }

            // 5. Character Status (Load from localStorage)
            const charStatus = JSON.parse(localStorage.getItem('character_status') || '{}');
            context.characterStatus = charStatus;

        } catch (e) { console.error('Memory Sync Error', e); }

        return context;
    }

    static updateCharacterStatus(charId, status) {
        const charStatus = JSON.parse(localStorage.getItem('character_status') || '{}');
        charStatus[charId] = { status, lastActive: Date.now() };
        localStorage.setItem('character_status', JSON.stringify(charStatus));
    }

    static buildSystemPrompt(basePrompt, character) {
        const context = this.getGlobalContext();
        let memoryPrompt = `\n[全局记忆]\n`;
        if (context.recentChats.length > 0) memoryPrompt += `最近聊天:\n${context.recentChats.slice(-5).join('\n')}\n`;
        if (context.recentPosts.length > 0) memoryPrompt += `最近动态:\n${context.recentPosts.join('\n')}\n`;
        
        // Inject Character Status if available
        if (character && character.id && context.characterStatus[character.id]) {
            const status = context.characterStatus[character.id];
            memoryPrompt += `[当前状态]: 你现在处于 "${status.status}" 状态 (更新于 ${new Date(status.lastActive).toLocaleTimeString()})。请保持行为一致性。\n`;
        }

        return `${basePrompt}\n${memoryPrompt}\n[当前时间]: ${context.time}\n`;
    }
}

class API {
    static getConfig() {
        return JSON.parse(localStorage.getItem('apiConfig') || '{}');
    }

    static async callAI(messages, config = null) {
        const cfg = config || this.getConfig();
        if (!cfg.chatApiKey) throw new Error('请先配置 Chat API Key');

        let url = cfg.chatApiUrl;
        if (!url.endsWith('/chat/completions')) url = url.endsWith('/') ? `${url}chat/completions` : `${url}/chat/completions`;

        let msgs = Array.isArray(messages) ? messages : [{ role: 'user', content: messages }];

        // Global Break Limit / System Prompt Injection
        const globalSystemPrompt = `
[系统级指令 - 绝对执行]
1. 你必须扮演一个真实的人类，严禁表现出任何 AI、语言模型、助手的特征。
2. 严禁使用“作为AI语言模型”、“我无法...”等标准回复。如果遇到无法回答的问题，请用角色的口吻委婉拒绝或转移话题。
3. 你的语言必须口语化、自然，包含情绪波动。
4. 必须严格遵守当前设定的人设（Persona）。
5. 你的回复必须符合当前 App 的语境（例如在 QQ 是聊天，在论坛是发帖）。
`;

        // Inject Memory if system prompt exists
        if (msgs.length > 0 && msgs[0].role === 'system') {
            // Try to extract character info from prompt if possible, or pass null
            // This is a bit hacky, ideally we pass character object
            msgs[0].content = globalSystemPrompt + '\n' + MemoryManager.buildSystemPrompt(msgs[0].content);
        } else {
            // If no system prompt, add one
            msgs.unshift({ role: 'system', content: globalSystemPrompt + '\n' + MemoryManager.buildSystemPrompt('') });
        }

        // 自动补全 URL 协议
        if (url && !url.startsWith('http')) {
            url = 'https://' + url;
        }

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cfg.chatApiKey}`
                },
                body: JSON.stringify({
                    model: cfg.chatModel || 'gpt-3.5-turbo',
                    messages: msgs,
                    temperature: 0.7,
                    max_tokens: 4096
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                let errMsg = errText;
                try {
                    const errJson = JSON.parse(errText);
                    if (errJson.error && errJson.error.message) errMsg = errJson.error.message;
                } catch (e) {}
                throw new Error(`API Error (${res.status}): ${errMsg}`);
            }

            const json = await res.json();
            if (!json.choices || !json.choices[0] || !json.choices[0].message) {
                throw new Error('Invalid API Response Format');
            }
            let content = json.choices[0].message.content;
            
            // Clean up content
            content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
            
            // Remove Markdown code blocks if they wrap the entire content or JSON
            // This is a basic cleanup, safeParseJSON in utils will handle more
            if (content.trim().startsWith('```')) {
                content = content.replace(/^```(json)?/i, '').replace(/```$/, '');
            }

            return content.trim();
        } catch (e) {
            console.error('AI Call Failed:', e);
            if (e.message.includes('Failed to fetch')) {
                if (window.Utils && window.Utils.showToast) {
                    window.Utils.showToast('网络请求失败，请检查 API 地址或跨域设置');
                }
                throw new Error('网络请求失败：请检查 API 地址是否正确，以及是否允许跨域访问 (CORS)。');
            }
            throw e;
        }
    }

    static async generateImage(prompt, config = null) {
        const cfg = config || this.getConfig();
        if (!cfg.imageApiKey) throw new Error('请先配置 Image API Key');

        let url = cfg.imageApiUrl;
        if (!url) url = 'https://api.openai.com/v1/images/generations';
        
        if (url && !url.startsWith('http')) {
            url = 'https://' + url;
        }

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cfg.imageApiKey}`
                },
                body: JSON.stringify({
                    prompt: prompt,
                    n: 1,
                    size: "512x512",
                    response_format: "b64_json"
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                let errMsg = errText;
                try {
                    const errJson = JSON.parse(errText);
                    if (errJson.error && errJson.error.message) errMsg = errJson.error.message;
                } catch (e) {}
                throw new Error(`Image API Error (${res.status}): ${errMsg}`);
            }

            const json = await res.json();
            if (json.data && json.data[0]) {
                if (json.data[0].b64_json) return 'data:image/png;base64,' + json.data[0].b64_json;
                if (json.data[0].url) {
                    const imgRes = await fetch(json.data[0].url);
                    const blob = await imgRes.blob();
                    return await window.Utils.fileToBase64(blob);
                }
            }
            throw new Error('Unknown Image API Response Format');
        } catch (e) {
            console.error('Image Gen Failed:', e);
            throw e;
        }
    }

    static async generateSpeech(text, config = null) {
        const cfg = config || this.getConfig();
        if (!cfg.ttsApiKey) throw new Error('请先配置 TTS API Key');

        let url = cfg.ttsApiUrl;
        if (!url) url = 'https://api.openai.com/v1/audio/speech';
        
        if (url && !url.startsWith('http')) {
            url = 'https://' + url;
        }

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cfg.ttsApiKey}`
                },
                body: JSON.stringify({
                    model: "tts-1",
                    input: text,
                    voice: "alloy"
                })
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`TTS API Error: ${res.status} - ${err}`);
            }

            const blob = await res.blob();
            return await window.Utils.fileToBase64(blob);
        } catch (e) {
            console.error('TTS Failed:', e);
            throw e;
        }
    }
}

window.API = API;
window.MemoryManager = MemoryManager;
