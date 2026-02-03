class FanficStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('fanfic_data')) {
            const initialData = {
                posts: [], // {id, type, title, content, author, authorAvatar, time, comments:[], likes:0, tags:[]}
                authors: [], // {name, avatar, bio, followers:0}
                user: {
                    name: '我',
                    avatar: '',
                    bio: '普通读者',
                    following: [], // author names
                    likes: [] // post ids
                },
                settings: {
                    customRules: ''
                }
            };
            localStorage.setItem('fanfic_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('fanfic_data')); }
    set(data) { localStorage.setItem('fanfic_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class FanficApp {
    constructor() {
        this.store = new FanficStore();
        this.currentTab = 'board'; // board, me
        this.currentBoard = 'reverse'; // reverse, fanfic, custom
        this.initUI();
    }

    initUI() {
        // Bottom Nav Switching
        document.querySelectorAll('.ff-nav-item').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.ff-nav-item').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.dataset.tab;
                
                if(this.currentTab === 'me') {
                    this.renderMe();
                    document.getElementById('ffBoardPage').style.display = 'none';
                    document.getElementById('ffMePage').style.display = 'block';
                } else {
                    this.renderList();
                    document.getElementById('ffBoardPage').style.display = 'flex';
                    document.getElementById('ffMePage').style.display = 'none';
                }
            };
        });

        // Board Sub-Tabs Switching
        document.querySelectorAll('.ff-sub-tab').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.ff-sub-tab').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                this.currentBoard = btn.dataset.board;
                this.renderList();
                
                // Show/Hide Settings Icon for Custom Board
                const settingsIcon = document.getElementById('ffSettingsIcon');
                if(this.currentBoard === 'custom') settingsIcon.style.display = 'block';
                else settingsIcon.style.display = 'none';
            };
        });

        // Generator Button (Pencil Icon)
        const genBtn = document.getElementById('ffGenBtn');
        if(genBtn) genBtn.onclick = () => this.openGenerator();

        // Settings
        const settingsIcon = document.getElementById('ffSettingsIcon');
        if(settingsIcon) settingsIcon.onclick = () => this.openSettings();
        
        document.getElementById('closeFfSettings').onclick = () => document.getElementById('ffSettingsModal').style.display = 'none';
        document.getElementById('saveFfSettings').onclick = () => this.saveSettings();
        document.getElementById('exportFfSettings').onclick = () => this.exportSettings();
        document.getElementById('importFfSettings').onclick = () => document.getElementById('importFfInput').click();
        document.getElementById('importFfInput').onchange = (e) => this.importSettings(e.target.files[0]);

        // Generator Modal
        document.getElementById('closeFfGenerator').onclick = () => document.getElementById('ffGeneratorModal').style.display = 'none';
        document.getElementById('doFfGenerate').onclick = () => this.generatePost();

        // Reader Modal
        document.getElementById('closeFfReader').onclick = () => document.getElementById('ffReaderModal').style.display = 'none';

        // Initial Render
        this.renderList();
    }

    renderList() {
        const list = document.getElementById('ffList');
        list.innerHTML = '';
        const data = this.store.get();
        
        const posts = data.posts.filter(p => p.type === this.currentBoard).sort((a, b) => b.time - a.time);

        if(posts.length === 0) {
            list.innerHTML = '<div style="text-align:center; color:#999; margin-top:50px;">暂无内容，点击右上角生成</div>';
            return;
        }

        posts.forEach(p => {
            const div = document.createElement('div');
            div.className = 'ff-card';
            
            let avatar = p.authorAvatar;
            if(avatar && avatar.startsWith('img_')) {
                window.db.getImage(avatar).then(url => {
                    const el = div.querySelector('.ff-card-avatar');
                    if(el) el.style.backgroundImage = `url('${url}')`;
                });
            } else {
                avatar = window.Utils.generateDefaultAvatar(p.author);
            }

            const tagsHtml = (p.tags || []).map(t => `<span style="background:#eee;padding:2px 5px;border-radius:4px;font-size:10px;margin-right:5px;">${t}</span>`).join('');

            div.innerHTML = `
                <div class="ff-card-header">
                    <div class="ff-card-avatar" style="background-image:url('${avatar}')"></div>
                    <div class="ff-card-author">${p.author}</div>
                </div>
                <div class="ff-card-title">${p.title}</div>
                <div style="margin-bottom:5px;">${tagsHtml}</div>
                <div class="ff-card-preview">${p.content}</div>
                <div class="ff-card-meta">
                    <span>${new Date(p.time).toLocaleDateString()}</span>
                    <span>${p.content.length} 字</span>
                    <span><i class="fas fa-heart"></i> ${p.likes || 0}</span>
                </div>
            `;
            
            div.onclick = () => this.openReader(p);
            div.querySelector('.ff-card-header').onclick = (e) => {
                e.stopPropagation();
                this.openAuthor(p.author);
            };
            
            // Long press to delete
            div.oncontextmenu = (e) => {
                e.preventDefault();
                if(confirm('删除这篇文章？')) {
                    this.store.update(d => d.posts = d.posts.filter(x => x.id !== p.id));
                    this.renderList();
                }
            };
            
            list.appendChild(div);
        });
    }

    openReader(post) {
        const modal = document.getElementById('ffReaderModal');
        const contentDiv = document.querySelector('.ff-reader-content');
        contentDiv.innerHTML = '';
        
        // Header Info
        const header = document.createElement('div');
        header.style.cssText = 'padding:10px; border-bottom:1px solid #eee; display:flex; align-items:center; gap:10px;';
        let avatar = post.authorAvatar || window.Utils.generateDefaultAvatar(post.author);
        if(avatar.startsWith('img_')) window.db.getImage(avatar).then(url => header.querySelector('img').src = url);
        
        const isLiked = this.store.get().user.likes.includes(post.id);
        
        header.innerHTML = `
            <img src="${avatar}" style="width:40px; height:40px; border-radius:50%;">
            <div style="flex:1;">
                <div style="font-weight:bold;">${post.author}</div>
                <div style="font-size:12px; color:#999;">${new Date(post.time).toLocaleString()}</div>
            </div>
            <button id="ffRewardBtn" class="action-btn secondary" style="width:auto; padding:5px 10px; margin-right:5px;">打赏</button>
            <button id="ffLikeBtn" class="action-btn secondary" style="width:auto; padding:5px 10px;">
                <i class="${isLiked ? 'fas' : 'far'} fa-heart" style="color:${isLiked ? 'red' : 'inherit'}"></i>
            </button>
        `;
        contentDiv.appendChild(header);
        
        header.querySelector('#ffLikeBtn').onclick = () => {
            this.store.update(d => {
                const p = d.posts.find(x => x.id === post.id);
                if(d.user.likes.includes(post.id)) {
                    d.user.likes = d.user.likes.filter(id => id !== post.id);
                    if(p) p.likes--;
                } else {
                    d.user.likes.push(post.id);
                    if(p) p.likes++;
                }
            });
            this.openReader(post); // Refresh
        };

        header.querySelector('#ffRewardBtn').onclick = () => {
            const amt = prompt('请输入打赏金额 (QQ余额):', '5.20');
            if(amt) {
                const qqData = JSON.parse(localStorage.getItem('qq_data'));
                if(parseFloat(qqData.wallet.balance) < parseFloat(amt)) return alert('余额不足');
                
                qqData.wallet.balance = (parseFloat(qqData.wallet.balance) - parseFloat(amt)).toFixed(2);
                qqData.wallet.history.unshift({date: new Date().toLocaleString(), amount: `-${amt}`, reason: `打赏作者 ${post.author}`});
                localStorage.setItem('qq_data', JSON.stringify(qqData));
                alert('打赏成功！作者已收到你的心意。');
                
                if(Notification.permission === 'granted') new Notification(post.author, {body: `谢谢你的打赏！我会继续努力的！`});
            }
        };

        // Title & Content
        const title = document.createElement('div');
        title.className = 'ff-reader-title';
        title.innerText = post.title;
        contentDiv.appendChild(title);
        
        const text = document.createElement('div');
        text.style.cssText = 'line-height:1.8; font-size:16px; padding:10px; white-space:pre-wrap;';
        text.innerText = post.content;
        contentDiv.appendChild(text);
        
        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.style.cssText = 'display:flex; gap:10px; padding:10px; justify-content:center;';
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'action-btn';
        nextBtn.innerText = '生成下一章';
        nextBtn.onclick = () => this.generateNextChapter(post);
        
        const urgeBtn = document.createElement('button');
        urgeBtn.className = 'action-btn secondary';
        urgeBtn.innerText = '催更';
        urgeBtn.onclick = () => {
            alert('催更成功！作者收到了你的刀片。');
            if(Notification.permission === 'granted') setTimeout(() => new Notification(post.author, {body: '别催了别催了，在写了！'}), 2000);
        };
        
        actionsDiv.appendChild(urgeBtn);
        actionsDiv.appendChild(nextBtn);
        contentDiv.appendChild(actionsDiv);

        // Comments
        const commentsDiv = document.createElement('div');
        commentsDiv.className = 'ff-comment-section';
        commentsDiv.innerHTML = '<h3>评论</h3>';
        
        if(post.comments && post.comments.length > 0) {
            post.comments.forEach(c => {
                const cDiv = document.createElement('div');
                cDiv.className = 'ff-comment-item';
                cDiv.innerHTML = `<div class="ff-comment-user">${c.user}</div><div class="ff-comment-text">${c.text}</div>`;
                commentsDiv.appendChild(cDiv);
            });
        } else {
            commentsDiv.innerHTML += '<div style="color:#999;">暂无评论</div>';
        }
        
        // Comment Input
        const inputDiv = document.createElement('div');
        inputDiv.style.cssText = 'display:flex; gap:10px; margin-top:10px;';
        inputDiv.innerHTML = `
            <input id="ffCommentInput" style="flex:1; padding:8px; border:1px solid #ddd; border-radius:4px;" placeholder="发表评论...">
            <button id="ffCommentBtn" class="action-btn" style="width:auto;">发送</button>
        `;
        commentsDiv.appendChild(inputDiv);
        
        contentDiv.appendChild(commentsDiv);
        
        // Bind Comment Event
        const commentBtn = inputDiv.querySelector('#ffCommentBtn');
        commentBtn.onclick = async () => {
            const val = inputDiv.querySelector('#ffCommentInput').value;
            if(val) {
                this.store.update(d => {
                    const p = d.posts.find(x => x.id === post.id);
                    if(p) p.comments.push({user: d.user.name, text: val});
                });
                this.openReader(post);

                // AI Reply
                const apiConfig = window.API.getConfig();
                if(apiConfig.chatApiKey) {
                    const prompt = `用户在同人文《${post.title}》下评论: "${val}"。\n请生成 1-2 条回复（可以是作者回复，也可以是其他读者）。返回JSON数组: [{"user": "昵称", "text": "回复"}]`;
                    try {
                        const res = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
                        const replies = window.Utils.safeParseJSON(res);
                        if(Array.isArray(replies)) {
                            this.store.update(d => {
                                const p = d.posts.find(x => x.id === post.id);
                                if(p) replies.forEach(r => p.comments.push(r));
                            });
                            this.openReader(post);
                        }
                    } catch(e) {}
                }
            }
        };

        modal.style.display = 'flex';
    }

    openAuthor(authorName) {
        const data = this.store.get();
        let author = data.authors.find(a => a.name === authorName);
        if(!author) {
            author = { name: authorName, avatar: '', bio: '神秘作者', followers: Math.floor(Math.random()*1000) };
            this.store.update(d => d.authors.push(author));
        }
        
        const modal = document.createElement('div');
        modal.className = 'sub-page';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="sub-header">
                <button class="back-btn" onclick="this.closest('.sub-page').remove()"><i class="fas fa-chevron-left"></i></button>
                <span class="sub-title">${author.name}</span>
            </div>
            <div class="sub-content" style="padding:20px; text-align:center;">
                <div style="width:80px; height:80px; border-radius:50%; background:#ccc; margin:0 auto; background-size:cover;" id="authorAvatar"></div>
                <h2>${author.name}</h2>
                <p>${author.bio}</p>
                <div style="display:flex; justify-content:center; gap:20px; margin:20px 0;">
                    <div><b>${author.followers}</b> 粉丝</div>
                    <div><b>${data.posts.filter(p => p.author === author.name).length}</b> 作品</div>
                </div>
                <button class="action-btn" id="followBtn">${data.user.following.includes(author.name) ? '已关注' : '关注'}</button>
                
                <div style="text-align:left; margin-top:30px;">
                    <h3>作品列表</h3>
                    <div id="authorWorks"></div>
                </div>
            </div>
        `;
        document.getElementById('fanficApp').appendChild(modal);
        
        let avatar = author.avatar || window.Utils.generateDefaultAvatar(author.name);
        if(avatar.startsWith('img_')) window.db.getImage(avatar).then(url => modal.querySelector('#authorAvatar').style.backgroundImage = `url('${url}')`);
        else modal.querySelector('#authorAvatar').style.backgroundImage = `url('${avatar}')`;
        
        const worksDiv = modal.querySelector('#authorWorks');
        data.posts.filter(p => p.author === author.name).forEach(p => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:10px; border-bottom:1px solid #eee; cursor:pointer;';
            div.innerText = p.title;
            div.onclick = () => this.openReader(p);
            worksDiv.appendChild(div);
        });
        
        modal.querySelector('#followBtn').onclick = () => {
            this.store.update(d => {
                if(d.user.following.includes(author.name)) {
                    d.user.following = d.user.following.filter(n => n !== author.name);
                    modal.querySelector('#followBtn').innerText = '关注';
                } else {
                    d.user.following.push(author.name);
                    modal.querySelector('#followBtn').innerText = '已关注';
                }
            });
        };
    }

    renderMe() {
        const data = this.store.get();
        const container = document.getElementById('ffMePage');
        container.innerHTML = `
            <div class="ff-me-header">
                <div class="ff-me-avatar" id="myAvatar"></div>
                <div class="ff-me-name" id="myName">${data.user.name}</div>
                <div class="ff-me-bio" id="myBio">${data.user.bio}</div>
                <button class="action-btn secondary" id="editMeBtn" style="width:auto; padding:5px 15px; font-size:12px; margin-top:10px;">编辑资料</button>
                
                <div class="ff-me-stats">
                    <div class="ff-stat-item"><div class="ff-stat-num">${data.user.following.length}</div><div class="ff-stat-label">关注</div></div>
                    <div class="ff-stat-item"><div class="ff-stat-num">${data.user.likes.length}</div><div class="ff-stat-label">点赞</div></div>
                </div>
            </div>
            
            <div class="ff-sub-tabs" style="margin-bottom:0;">
                <div class="ff-sub-tab active" id="tabLikes">我的点赞</div>
                <div class="ff-sub-tab" id="tabFollowing">我的关注</div>
            </div>
            <div id="meList" style="padding:10px;"></div>
        `;
        
        let avatar = data.user.avatar;
        if(avatar && avatar.startsWith('img_')) window.db.getImage(avatar).then(url => document.getElementById('myAvatar').style.backgroundImage = `url('${url}')`);
        
        document.getElementById('editMeBtn').onclick = () => {
            const name = prompt('昵称:', data.user.name);
            if(name) {
                const bio = prompt('简介:', data.user.bio);
                this.store.update(d => { d.user.name = name; d.user.bio = bio; });
                this.renderMe();
            }
        };
        
        const renderLikes = () => {
            const list = document.getElementById('meList');
            list.innerHTML = '';
            data.user.likes.forEach(id => {
                const p = data.posts.find(x => x.id === id);
                if(p) {
                    const div = document.createElement('div');
                    div.className = 'ff-card';
                    div.innerHTML = `<div class="ff-card-title">${p.title}</div><div class="ff-card-author">${p.author}</div>`;
                    div.onclick = () => this.openReader(p);
                    list.appendChild(div);
                }
            });
        };
        
        const renderFollowing = () => {
            const list = document.getElementById('meList');
            list.innerHTML = '';
            data.user.following.forEach(name => {
                const div = document.createElement('div');
                div.style.cssText = 'padding:15px; background:#fff; margin-bottom:10px; border-radius:8px; display:flex; align-items:center;';
                div.innerHTML = `<div style="font-weight:bold; flex:1;">${name}</div><button class="action-btn secondary" style="width:auto;">查看</button>`;
                div.querySelector('button').onclick = () => this.openAuthor(name);
                list.appendChild(div);
            });
        };
        
        document.getElementById('tabLikes').onclick = (e) => {
            document.querySelectorAll('#ffMePage .ff-sub-tab').forEach(el => el.classList.remove('active'));
            e.target.classList.add('active');
            renderLikes();
        };
        
        document.getElementById('tabFollowing').onclick = (e) => {
            document.querySelectorAll('#ffMePage .ff-sub-tab').forEach(el => el.classList.remove('active'));
            e.target.classList.add('active');
            renderFollowing();
        };
        
        renderLikes();
    }

    openGenerator() {
        document.getElementById('ffGeneratorModal').style.display = 'flex';
        document.getElementById('ffPromptInput').value = '';
        document.getElementById('ffPromptInput').focus();
        
        // Add Batch Option if not exists
        if(!document.getElementById('ffBatchCount')) {
            const div = document.createElement('div');
            div.style.marginTop = '10px';
            div.innerHTML = `
                <label>生成数量: </label>
                <select id="ffBatchCount">
                    <option value="1">1 篇</option>
                    <option value="3">3 篇 (批量)</option>
                    <option value="5">5 篇 (批量)</option>
                </select>
            `;
            document.querySelector('.ff-input-group').appendChild(div);
        }
    }

    async generatePost() {
        const promptText = document.getElementById('ffPromptInput').value.trim();
        const count = parseInt(document.getElementById('ffBatchCount').value || 1);
        
        if(!promptText) return;

        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if(!apiConfig.chatApiKey) return alert('请先在设置中配置 API Key');

        const btn = document.getElementById('doFfGenerate');
        btn.innerText = '生成中...';
        btn.disabled = true;

        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
        const user = qqData.user;
        const friend = qqData.friends.length > 0 ? qqData.friends[Math.floor(Math.random() * qqData.friends.length)] : {name: 'AI', persona: '助手'};

        // Inject Global Memory
        const globalContext = window.MemoryManager.getGlobalContext();
        const memoryPrompt = `\n[最近发生的事]:\n${globalContext.recentChats.join('\n')}\n请根据这些近期聊天内容，创作相关的同人内容。\n`;

        let systemPrompt = '';
        let authorName = '';
        
        if(this.currentBoard === 'reverse') {
            authorName = friend.name;
            systemPrompt = `你扮演 ${friend.name}。\n人设: ${friend.persona}\n请写一篇关于你和用户(${user.name})的私密日记或梦女文。\n
            ${memoryPrompt}
            规则：
            1. 必须有活人感，暴露最真实的自己（包括占有欲、黑化、病娇、依恋等）。
            2. 设定为你不知道用户会看到这些内容，所以要大胆、露骨、真实。
            3. 标签：黑化/病娇/囚禁/清水/R18/短文/随笔/真实记录。
            4. 严禁 AI 味，使用第一人称。
            5. 必须是正经的小说文体，包含环境描写、心理描写、动作描写，不要只有对话或简单的流水账。`;
        } else if(this.currentBoard === 'fanfic') {
            authorName = '磕学家_' + Math.floor(Math.random()*1000);
            systemPrompt = `你是一个同人女/磕学家。\n请写一篇关于 ${friend.name} 和 用户(${user.name}) 的同人小说。\n
            ${memoryPrompt}
            规则：
            1. 设定为你和他们不在同一个世界，你在观察他们并进行创作。把他们当成小说人物/纸片人来嗑CP。
            2. 风格：正经的小说文体，必须包含细腻的环境描写、心理描写、动作描写和对话描写。
            3. 不要只写“发疯文学”或简单的吐槽，要写出有剧情、有氛围感的故事。
            4. 标签：黑化/病娇/囚禁/清水/R18/短文/长文/日常。`;
        } else {
            authorName = '匿名用户';
            const settings = this.store.get().settings;
            systemPrompt = `请根据以下世界观设定写一篇故事：\n${settings.customRules || '自由发挥'}\n
            规则：
            1. 必须带有标签：黑化/病娇/囚禁/清水/R18/短文/长文/日常。
            2. 多加想象，要有活人感。
            3. 必须是正经的小说文体，包含环境描写、心理描写、动作描写。`;
        }

        const fullPrompt = `${systemPrompt}\n\n用户要求: ${promptText}\n\n请生成 ${count} 篇不同的短文。\n请严格返回JSON数组格式: [{"title": "标题", "content": "正文内容", "tags": ["标签1", "标签2"]}]`;

        try {
            const res = await window.API.callAI([{role:'system', content:fullPrompt}], apiConfig);
            let results = window.Utils.safeParseJSON(res);

            if (!results) {
                // Fallback: try to treat as single object or text
                results = [{ title: '无题', content: res, tags: [] }];
            } else if(!Array.isArray(results)) {
                results = [results];
            }

            this.store.update(d => {
                results.forEach(r => {
                    d.posts.push({
                        id: window.Utils.generateId('ff'),
                        type: this.currentBoard,
                        title: r.title || '无题',
                        content: r.content || '',
                        author: authorName,
                        authorAvatar: '',
                        time: Date.now(),
                        comments: [],
                        likes: Math.floor(Math.random() * 100),
                        tags: r.tags || []
                    });
                });
            });

            document.getElementById('ffGeneratorModal').style.display = 'none';
            this.renderList();

            if(results.length > 0) {
                const lastPost = this.store.get().posts[this.store.get().posts.length - 1];
                this.generateComments(lastPost.id, lastPost.content);
                if(Math.random() > 0.7) this.sharePost(lastPost);
            }

        } catch(e) {
            alert('生成失败: ' + e.message);
            console.error(e);
        } finally {
            btn.innerText = '生成';
            btn.disabled = false;
        }
    }

    async generateNextChapter(post) {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        const prompt = `请为文章《${post.title}》续写下一章。\n前文摘要: ${post.content.substring(post.content.length - 300)}\n要求：保持风格一致，情节连贯。`;
        
        try {
            const res = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
            
            this.store.update(d => {
                const p = d.posts.find(x => x.id === post.id);
                if(p) {
                    p.content += '\n\n【下一章】\n' + res;
                }
            });
            
            // Refresh reader content
            const contentDiv = document.querySelector('.ff-reader-content');
            // Find the text div (second child)
            if(contentDiv && contentDiv.children[1]) {
                contentDiv.children[1].innerText = post.content;
            }
            alert('已生成下一章');
        } catch(e) { alert('生成失败'); }
    }

    async generateComments(postId, context) {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return;
        
        const prompt = `请生成 3-5 条关于这篇同人文的评论。
        文章内容摘要: ${context.substring(0, 200)}...
        要求：
        1. 风格：同人女、激动、催更、分析剧情、嗑到了。
        2. 返回 JSON 数组: [{"user": "昵称", "text": "评论内容"}]`;
        
        try {
            const res = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
            const comments = window.Utils.safeParseJSON(res);
            
            if(Array.isArray(comments)) {
                this.store.update(d => {
                    const p = d.posts.find(x => x.id === postId);
                    if(p) {
                        comments.forEach(c => p.comments.push(c));
                    }
                });
            }
        } catch(e) { console.error(e); }
    }

    sharePost(post) {
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        if(qqData.friends.length === 0) return;
        
        const friend = qqData.friends[Math.floor(Math.random() * qqData.friends.length)];
        
        // Add to QQ messages
        if(!qqData.messages[friend.id]) qqData.messages[friend.id] = [];
        qqData.messages[friend.id].push({
            id: Date.now(), senderId: friend.id, senderName: friend.name, 
            content: `[分享同人] 我看到一篇超棒的文！\n《${post.title}》\n${post.content.substring(0, 30)}...`, 
            type: 'text', timestamp: Date.now(), status: 'normal'
        });
        localStorage.setItem('qq_data', JSON.stringify(qqData));
        
        if(Notification.permission === 'granted') {
            new Notification(friend.name, { body: '分享了一篇同人文给你' });
        }
    }

    openSettings() {
        const settings = this.store.get().settings;
        document.getElementById('ffCustomRules').value = settings.customRules || '';
        document.getElementById('ffSettingsModal').style.display = 'flex';
    }

    saveSettings() {
        const rules = document.getElementById('ffCustomRules').value;
        this.store.update(d => d.settings.customRules = rules);
        document.getElementById('ffSettingsModal').style.display = 'none';
    }

    exportSettings() {
        const settings = this.store.get().settings;
        const blob = new Blob([JSON.stringify(settings, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fanfic_settings.json';
        a.click();
    }

    importSettings(file) {
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const settings = JSON.parse(e.target.result);
                this.store.update(d => d.settings = settings);
                document.getElementById('ffCustomRules').value = settings.customRules || '';
                alert('导入成功');
            } catch(err) {
                alert('文件格式错误');
            }
        };
        reader.readAsText(file);
    }

}

window.FanficApp = new FanficApp();
