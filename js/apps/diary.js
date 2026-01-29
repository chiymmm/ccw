class DiaryStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('diary_data')) {
            const initialData = {
                notes: [] // {id, title, content, time, isLocked, password, type: 'text'|'voice'|'drawing', mediaUrl}
            };
            localStorage.setItem('diary_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('diary_data')); }
    set(data) { localStorage.setItem('diary_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class DiaryApp {
    constructor() {
        this.store = new DiaryStore();
        // No initUI here, rendered by PhoneCheckApp or direct call
    }

    render() {
        const container = document.getElementById('fanficApp'); // Reusing container
        container.innerHTML = `
            <div class="diary-header" style="background:#f2f2f7; padding:15px; border-bottom:1px solid #e5e5ea; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:bold; font-size:18px;">备忘录</span>
                <i class="fas fa-plus" id="diaryGenBtn" style="color:#e0a23b; cursor:pointer; font-size:20px;"></i>
            </div>
            <div id="diaryList" style="background:#fff; padding:0 15px;"></div>
        `;
        
        document.getElementById('diaryGenBtn').onclick = () => this.generateNote();
        this.renderList();
    }

    renderList() {
        const list = document.getElementById('diaryList');
        list.innerHTML = '';
        const data = this.store.get();
        
        if(data.notes.length === 0) {
            list.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">无备忘录</div>';
            return;
        }

        data.notes.sort((a, b) => b.time - a.time).forEach(note => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:15px 0; border-bottom:1px solid #e5e5ea; cursor:pointer;';
            
            let icon = '';
            if(note.isLocked) icon = '<i class="fas fa-lock" style="margin-right:5px;color:#999;"></i>';
            else if(note.type === 'voice') icon = '<i class="fas fa-microphone" style="margin-right:5px;color:#999;"></i>';
            else if(note.type === 'drawing') icon = '<i class="fas fa-pen" style="margin-right:5px;color:#999;"></i>';

            div.innerHTML = `
                <div style="font-weight:bold; margin-bottom:5px;">${icon}${note.title}</div>
                <div style="color:#8e8e93; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${new Date(note.time).toLocaleDateString()}  ${note.isLocked ? '已加密' : note.content}
                </div>
            `;
            div.onclick = () => this.openNote(note);
            list.appendChild(div);
        });
    }

    openNote(note) {
        if(note.isLocked) {
            const pwd = prompt('请输入密码查看笔记 (提示: 可能是生日或纪念日):');
            // Simple simulation: any 4 digit number works or specific logic
            if(!pwd || pwd.length !== 4) return alert('密码错误');
            alert('解锁成功');
        }

        const modal = document.createElement('div');
        modal.className = 'sub-page';
        modal.style.display = 'flex';
        modal.style.background = '#fff';
        
        let contentHtml = `<div style="line-height:1.6; white-space:pre-wrap;">${note.content}</div>`;
        
        if(note.type === 'voice' && note.mediaUrl) {
            contentHtml += `
                <div style="margin-top:20px; padding:15px; background:#f2f2f7; border-radius:10px; display:flex; align-items:center;">
                    <i class="fas fa-play-circle" style="font-size:30px; color:#007aff; margin-right:10px; cursor:pointer;" onclick="new Audio('${note.mediaUrl}').play()"></i>
                    <span>语音备忘录</span>
                </div>
            `;
        } else if(note.type === 'drawing' && note.mediaUrl) {
            contentHtml += `<img src="${note.mediaUrl}" style="width:100%; margin-top:20px; border-radius:10px;">`;
        }

        modal.innerHTML = `
            <div class="sub-header" style="background:#f2f2f7; border-bottom:1px solid #e5e5ea;">
                <button class="back-btn" onclick="this.closest('.sub-page').remove()" style="color:#e0a23b;"><i class="fas fa-chevron-left"></i> 备忘录</button>
                <div></div>
            </div>
            <div style="padding:20px; flex:1; overflow-y:auto;">
                <h2 style="margin-top:0;">${note.title}</h2>
                <div style="color:#999; font-size:12px; margin-bottom:20px;">${new Date(note.time).toLocaleString()}</div>
                ${contentHtml}
            </div>
        `;
        document.getElementById('fanficApp').appendChild(modal);
    }

    async generateNote() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        const btn = document.getElementById('diaryGenBtn');
        btn.className = 'fas fa-spinner fa-spin';
        
        const char = window.System.currentCheckedFriend;
        if(!char) return alert('请先选择角色');
        
        // Inject Global Memory
        const globalContext = window.MemoryManager.getGlobalContext();
        const memoryPrompt = `\n[最近发生的事]:\n${globalContext.recentChats.join('\n')}\n请根据这些近期聊天内容，生成相关的备忘录。\n`;

        const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n${memoryPrompt}\n请写一篇手机备忘录。\n内容可以是日记、待办事项、灵感记录、内心独白、加密日记(locked)或语音备忘录(voice)。\n返回 JSON: {"title": "标题", "content": "内容", "type": "text/voice/drawing/locked"}`;
        
        try {
            const res = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
            const note = JSON.parse(res);
            
            let mediaUrl = null;
            if(note.type === 'voice' && apiConfig.ttsApiKey) {
                try {
                    mediaUrl = await window.API.generateSpeech(note.content, apiConfig);
                } catch(e) { console.error('TTS failed', e); }
            } else if(note.type === 'drawing' && apiConfig.imageApiKey) {
                try {
                    mediaUrl = await window.API.generateImage(note.content, apiConfig);
                } catch(e) { console.error('Image failed', e); }
            }

            this.store.update(d => {
                d.notes.unshift({
                    id: Date.now(),
                    title: note.title,
                    content: note.content,
                    time: Date.now(),
                    isLocked: note.type === 'locked',
                    type: note.type === 'locked' ? 'text' : note.type,
                    mediaUrl: mediaUrl
                });
            });
            this.renderList();
        } catch(e) { alert('生成失败'); }
        finally { btn.className = 'fas fa-plus'; }
    }
}

window.DiaryApp = new DiaryApp();
