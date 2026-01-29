class ForumStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('forum_data')) {
            const initialData = {
                posts: [], // {id, boardId, title, content, author, authorAvatar, time, comments:[], likes:0, poll:null}
                boards: [], // {id, name, desc, icon}
                marketItems: [], // {id, title, price, seller, sellerAvatar, desc, comments:[], status: 'selling'}
                chats: [], // {userName, messages:[]}
                user: {
                    name: '我',
                    avatar: '',
                    signature: '这个人很懒，什么都没写',
                    bgImage: '',
                    stats: { posts: 0, replies: 0, likes: 0 },
                    history: { posts: [], replies: [], favorites: [], viewed: [] }
                },
                settings: { worldSetting: '现代网络社区', rules: '友好交流，禁止谩骂' }
            };
            localStorage.setItem('forum_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('forum_data')); }
    set(data) { 
        // Limit posts to prevent quota exceeded
        if(data.posts.length > 50) data.posts = data.posts.slice(0, 50);
        try {
            localStorage.setItem('forum_data', JSON.stringify(data)); 
        } catch(e) {
            console.error('Storage quota exceeded', e);
            alert('存储空间已满，将自动清理旧数据');
            data.posts = data.posts.slice(0, 20); // Aggressive cleanup
            localStorage.setItem('forum_data', JSON.stringify(data));
        }
    }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class ForumApp {
    constructor() {
        this.store = new ForumStore();
        this.currentTab = 'home';
        this.currentBoardId = null;
        this.initUI();
    }

    initUI() {
        // Bottom Nav Switching
        document.querySelectorAll('.forum-nav-item').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.forum-nav-item').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.dataset.tab;
                
                document.querySelectorAll('.forum-page').forEach(el => el.style.display = 'none');
                document.getElementById(`forum-${this.currentTab}`).style.display = 'block';
                
                this.render();
            };
        });

        // Header Buttons
        document.getElementById('forumSettingsBtn').onclick = () => this.openSettings();
        
        // Search
        const searchInput = document.getElementById('forumSearchInput');
        if(searchInput) {
            searchInput.onkeydown = (e) => {
                if(e.key === 'Enter') this.search(searchInput.value);
            };
            // Bind icon click
            const icon = searchInput.previousElementSibling;
            if(icon && icon.tagName === 'I') {
                icon.style.cursor = 'pointer';
                icon.onclick = () => this.search(searchInput.value);
            }
        }

        // Generate Buttons (Per Page)
        const bindGenBtn = (id, handler) => {
            const btn = document.getElementById(id);
            if(btn) btn.onclick = handler;
        };
        
        bindGenBtn('genHomeBtn', () => this.generatePosts(null));
        bindGenBtn('genBoardBtn', () => this.generateBoards());
        bindGenBtn('genMarketBtn', () => this.generateMarketItems());
        bindGenBtn('genChatBtn', () => this.generateNewChat());

        // Initial Render
        this.render();
    }

    async search(query) {
        if(!query) {
            this.render();
            return;
        }
        
        // Switch to home to show results
        this.currentTab = 'home';
        document.querySelectorAll('.forum-nav-item').forEach(el => el.classList.remove('active'));
        document.querySelector('.forum-nav-item[data-tab="home"]').classList.add('active');
        
        document.querySelectorAll('.forum-page').forEach(el => el.style.display = 'none');
        document.getElementById('forum-home').style.display = 'block';

        const list = document.getElementById('forumHomeList');
        list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">搜索中...</div>';
        
        const data = this.store.get();
        const posts = data.posts.filter(p => 
            p.title.toLowerCase().includes(query.toLowerCase()) || 
            p.content.toLowerCase().includes(query.toLowerCase())
        );

        if(posts.length === 0) {
            // If local search fails, try API generation
            const apiConfig = window.API.getConfig();
            if(apiConfig.chatApiKey) {
                list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">本地未找到，正在尝试生成相关内容...</div>';
                await this.generatePosts(null, query);
                return;
            }
            
            list.innerHTML = `<div style="text-align:center;padding:20px;color:#999;">未找到包含 "${query}" 的帖子</div>`;
            return;
        }

        list.innerHTML = '';
        posts.forEach(p => {
            const div = document.createElement('div');
            div.className = 'forum-post';
            div.innerHTML = `
                <div class="forum-post-title">${p.title}</div>
                <div class="forum-post-meta">
                    <span>${p.author}</span>
                    <span>${new Date(p.time).toLocaleDateString()}</span>
                </div>
                <div class="forum-post-meta" style="margin-top:5px;">
                    <span><i class="far fa-comment"></i> ${p.comments.length}</span>
                    <span><i class="far fa-thumbs-up"></i> ${p.likes || 0}</span>
                </div>
            `;
            div.onclick = () => this.openPost(p);
            list.appendChild(div);
        });
    }

    render() {
        if(this.currentTab === 'home') this.renderHome();
        if(this.currentTab === 'boards') this.renderBoards();
        if(this.currentTab === 'market') this.renderMarket();
        if(this.currentTab === 'chat') this.renderChatList();
        if(this.currentTab === 'me') this.renderMe();
    }

    async renderHome() {
        const list = document.getElementById('forumHomeList');
        list.innerHTML = '';
        const data = this.store.get();
        
        const posts = data.posts.sort((a, b) => b.time - a.time).slice(0, 20);
        
        if(posts.length === 0) {
            list.innerHTML = `
                <div style="text-align:center;padding:50px;color:#999;display:flex;flex-direction:column;align-items:center;gap:20px;">
                    <p>暂无帖子</p>
                </div>
            `;
            return;
        }

        posts.forEach(p => {
            const div = document.createElement('div');
            div.className = 'forum-post';
            div.innerHTML = `
                <div class="forum-post-title">${p.title}</div>
                <div class="forum-post-meta">
                    <span>${p.author}</span>
                    <span>${new Date(p.time).toLocaleDateString()}</span>
                </div>
                <div class="forum-post-meta" style="margin-top:5px;">
                    <span><i class="far fa-comment"></i> ${p.comments.length}</span>
                    <span><i class="far fa-thumbs-up"></i> ${p.likes || 0}</span>
                    <span style="margin-left:auto;cursor:pointer;" onclick="event.stopPropagation(); window.ForumApp.sharePost('${p.id}')"><i class="fas fa-share"></i></span>
                </div>
            `;
            div.onclick = () => this.openPost(p);
            list.appendChild(div);
        });
    }

    async generatePosts(boardId, query = null) {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const btn = document.getElementById(boardId ? 'genBoardDetailBtn' : 'genHomeBtn');
        if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const settings = this.store.get().settings;
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        const friends = qqData.friends;
        
        const boardName = boardId ? (this.store.get().boards.find(b => b.id === boardId)?.name || '未知板块') : '综合区';

        // Inject Global Memory
        const globalContext = window.MemoryManager.getGlobalContext();
        const memoryPrompt = `\n[最近发生的事]:\n${globalContext.recentChats.join('\n')}\n请根据这些近期聊天内容，让好友发布相关的论坛帖子。\n`;

        let prompt = `基于世界观"${settings.worldSetting}"，在"${boardName}"板块生成 5-8 个论坛帖子。
        ${memoryPrompt}`;
        if(query) prompt += `\n帖子内容必须与关键词 "${query}" 相关。`;
        
        prompt += `
        要求：
        1. 标题吸引人，内容符合板块主题，内容要长一些，有实质性内容。
        2. 作者可以是路人，也可以是QQ好友（${friends.map(f => f.name).join(', ')}）。
        3. 每个帖子包含 3-5 条初始评论，评论要有互动感。
        4. 随机生成一些投票贴 (poll)。
        5. 返回 JSON 数组：
        [
            {
                "title": "标题", "content": "正文", "author": "作者名", "likes": 10,
                "poll": {"question": "投票问题", "options": ["选项1", "选项2"]},
                "comments": [{"author": "评论人", "content": "评论内容"}]
            }
        ]`;

        try {
            const res = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
            let newPosts = window.Utils.safeParseJSON(res);

            if (Array.isArray(newPosts)) {
                // Process images asynchronously
                const processedPosts = [];
                for (const p of newPosts) {
                    let avatar = '';
                    const friend = friends.find(f => f.name === p.author);
                    if(friend) avatar = friend.avatar;
                    else {
                        // Generate avatar for stranger and save to DB
                        const avatarBase64 = window.Utils.generateDefaultAvatar(p.author);
                        avatar = await window.db.saveImage(avatarBase64);
                    }

                    // Generate and save image to DB
                    const imgBase64 = window.Utils.generateDefaultImage(p.title);
                    const imgId = await window.db.saveImage(imgBase64);

                    processedPosts.push({
                        id: window.Utils.generateId('post'),
                        boardId: boardId || 'general',
                        title: p.title,
                        content: p.content,
                        author: p.author,
                        authorAvatar: avatar,
                        time: Date.now(),
                        likes: p.likes || 0,
                        poll: p.poll || null,
                        comments: (p.comments || []).map(c => ({
                            author: c.author,
                            content: c.content,
                            time: Date.now()
                        })),
                        image: imgId // Store ID instead of Base64
                    });
                }

                this.store.update(d => {
                    processedPosts.forEach(p => d.posts.unshift(p));
                });
                
                if(boardId) this.renderBoards();
                else this.renderHome();
            }
        } catch(e) {
            console.error(e);
            alert('生成失败: ' + e.message);
        } finally {
            if(btn) btn.innerHTML = '<i class="fas fa-magic"></i>';
        }
    }

    async generateBoards() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        const btn = document.getElementById('genBoardBtn');
        if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        const settings = this.store.get().settings;
        const prompt = `基于世界观"${settings.worldSetting}"，生成 4-6 个论坛板块。
        返回 JSON 数组: [{"name": "板块名", "desc": "简介", "icon": "Emoji图标"}]`;
        
        try {
            const res = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
            const boards = window.Utils.safeParseJSON(res);
            if(Array.isArray(boards)) {
                this.store.update(d => {
                    boards.forEach(b => {
                        if(!d.boards.find(x => x.name === b.name)) {
                            d.boards.push({
                                id: window.Utils.generateId('board'),
                                name: b.name,
                                desc: b.desc,
                                icon: b.icon
                            });
                        }
                    });
                });
                this.renderBoards();
            }
        } catch(e) { alert('生成失败'); }
        finally { if(btn) btn.innerHTML = '<i class="fas fa-magic"></i>'; }
    }

    renderBoards() {
        const list = document.getElementById('forumBoardList');
        list.innerHTML = '';
        const data = this.store.get();

        if(this.currentBoardId) {
            const board = data.boards.find(b => b.id === this.currentBoardId);
            const posts = data.posts.filter(p => p.boardId === this.currentBoardId).sort((a, b) => b.time - a.time);
            
            const headerDiv = document.createElement('div');
            headerDiv.style.padding = '10px';
            headerDiv.style.background = '#fff';
            headerDiv.style.marginBottom = '10px';
            headerDiv.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;">
                    <i class="fas fa-arrow-left" style="cursor:pointer;" id="backToBoards"></i>
                    <h3 style="margin:0;">${board.name}</h3>
                    <div class="forum-gen-btn" id="genBoardDetailBtn" style="margin-left:auto;"><i class="fas fa-magic"></i></div>
                </div>
                <p style="color:#666;font-size:12px;margin-top:5px;">${board.desc}</p>
            `;
            list.appendChild(headerDiv);
            headerDiv.querySelector('#backToBoards').onclick = () => { this.currentBoardId = null; this.renderBoards(); };
            headerDiv.querySelector('#genBoardDetailBtn').onclick = () => this.generatePosts(this.currentBoardId);

            if(posts.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.style.textAlign = 'center';
                emptyDiv.style.padding = '20px';
                emptyDiv.style.color = '#999';
                emptyDiv.innerHTML = '本板块暂无帖子，点击右上角生成';
                list.appendChild(emptyDiv);
            }

            posts.forEach(p => {
                const div = document.createElement('div');
                div.className = 'forum-post';
                div.innerHTML = `
                    <div class="forum-post-title">${p.title}</div>
                    <div class="forum-post-meta">
                        <span>${p.author}</span>
                        <span>${new Date(p.time).toLocaleDateString()}</span>
                    </div>
                `;
                div.onclick = () => this.openPost(p);
                list.appendChild(div);
            });

        } else {
            if (data.boards.length === 0) {
                list.innerHTML = `
                    <div style="text-align:center;padding:50px;color:#999;">
                        <p>暂无板块，点击右上角生成</p>
                    </div>
                `;
                return;
            }

            data.boards.forEach(b => {
                const div = document.createElement('div');
                div.className = 'forum-board-item';
                div.innerHTML = `
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:40px;height:40px;background:#f5f5f5;border-radius:12px;display:flex;justify-content:center;align-items:center;font-size:20px;">${b.icon || '📁'}</div>
                        <div>
                            <div style="font-weight:bold;">${b.name}</div>
                            <div style="font-size:12px;color:#999;">${b.desc}</div>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right" style="color:#ccc;"></i>
                `;
                div.onclick = () => {
                    this.currentBoardId = b.id;
                    this.renderBoards();
                };
                list.appendChild(div);
            });
        }
    }

    async generateMarketItems() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        const btn = document.getElementById('genMarketBtn');
        if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        const settings = this.store.get().settings;
        const prompt = `基于世界观"${settings.worldSetting}"，生成 3-5 个闲置交易商品。
        要求：
        1. 物品奇特有趣，符合世界观。
        2. 卖家可以是路人。
        3. 返回 JSON 数组: [{"title": "商品名", "price": 99.9, "seller": "卖家名", "desc": "描述"}]`;
        
        try {
            const res = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
            const items = window.Utils.safeParseJSON(res);
            if(Array.isArray(items)) {
                const processedItems = [];
                for (const i of items) {
                    // Generate and save seller avatar
                    const avatarBase64 = window.Utils.generateDefaultAvatar(i.seller);
                    const avatarId = await window.db.saveImage(avatarBase64);

                    processedItems.push({
                        id: window.Utils.generateId('item'),
                        title: i.title,
                        price: i.price,
                        seller: i.seller,
                        sellerAvatar: avatarId,
                        desc: i.desc,
                        comments: [],
                        status: 'selling'
                    });
                }

                this.store.update(d => {
                    processedItems.forEach(i => d.marketItems.unshift(i));
                });
                this.renderMarket();
            }
        } catch(e) { alert('生成失败'); }
        finally { if(btn) btn.innerHTML = '<i class="fas fa-magic"></i>'; }
    }

    async renderMarket() {
        const list = document.getElementById('forumMarketList');
        list.innerHTML = '';
        const data = this.store.get();
        
        if(data.marketItems.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">暂无闲置物品，点击右上角生成</div>';
            return;
        }

        for(const item of data.marketItems) {
            const div = document.createElement('div');
            div.className = 'forum-market-item';
            
            let imgUrl = window.Utils.generateDefaultImage(item.title);
            
            div.innerHTML = `
                <div class="forum-market-img" style="background-image:url('${imgUrl}')"></div>
                <div style="flex:1;">
                    <div style="font-weight:bold;">${item.title}</div>
                    <div style="color:#ff5000;font-weight:bold;">¥${item.price}</div>
                    <div style="font-size:12px;color:#999;">卖家: ${item.seller}</div>
                    ${item.status === 'sold' ? '<div style="color:red;font-weight:bold;font-size:12px;">已售出</div>' : ''}
                </div>
                ${item.status !== 'sold' ? '<button class="shop-btn buy" style="height:fit-content;align-self:center;">购买</button>' : ''}
            `;
            
            if(item.status !== 'sold') {
                div.querySelector('.buy').onclick = (e) => {
                    e.stopPropagation();
                    this.openMarketItem(item);
                };
            }
            div.onclick = () => this.openMarketItem(item);
            
            list.appendChild(div);
        }
    }

    async generateNewChat() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        const btn = document.getElementById('genChatBtn');
        if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        const prompt = `生成一个论坛私信对话的开头。
        返回 JSON: {"userName": "用户名", "message": "第一条消息"}`;
        
        try {
            const res = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
            const json = window.Utils.safeParseJSON(res);
            
            this.startChatWithUser(json.userName);
            const data = this.store.get();
            const chat = data.chats.find(c => c.userName === json.userName);
            if(chat) {
                chat.messages.push({sender: 'other', content: json.message, time: Date.now()});
                this.store.set(data);
                this.renderChatList();
                
                const existingModal = document.querySelector('.sub-page');
                if(existingModal && existingModal.querySelector('.sub-title').innerText === json.userName) {
                    existingModal.remove();
                    this.openChat(chat);
                }
            }
        } catch(e) { alert('生成失败'); }
        finally { if(btn) btn.innerHTML = '<i class="fas fa-magic"></i>'; }
    }

    async renderMe() {
        const data = this.store.get();
        const user = data.user;
        const container = document.getElementById('forum-me');
        container.innerHTML = ''; // Clear previous

        // Header
        const header = document.createElement('div');
        header.style.cssText = `background:#333;color:#fff;padding:30px 20px;text-align:center;position:relative;`;
        if(user.bgImage) header.style.backgroundImage = `url('${user.bgImage}')`;
        
        let avatarUrl = user.avatar || '';
        if(avatarUrl.startsWith('img_')) {
            const blob = await window.db.getImage(avatarUrl);
            if(blob) avatarUrl = blob;
        }

        header.innerHTML = `
            <div id="forumUserAvatar" style="width:80px;height:80px;background:#fff;border-radius:50%;margin:0 auto;background-image:url('${avatarUrl}');background-size:cover;border:2px solid #fff;cursor:pointer;position:relative;">
                <div style="position:absolute;bottom:0;right:0;width:24px;height:24px;background:#007aff;border-radius:50%;display:flex;justify-content:center;align-items:center;"><i class="fas fa-camera" style="font-size:10px;"></i></div>
            </div>
            <h2 style="margin:10px 0 5px;">${user.name}</h2>
            <p style="opacity:0.8;font-size:12px;">${user.signature}</p>
            <button id="editProfileBtn" style="position:absolute;top:10px;right:10px;background:transparent;border:1px solid #fff;color:#fff;border-radius:15px;padding:2px 10px;font-size:12px;">编辑</button>
            <input type="file" id="forumAvatarInput" hidden accept="image/*">
        `;
        container.appendChild(header);

        // Stats
        const stats = document.createElement('div');
        stats.style.cssText = 'display:flex;justify-content:space-around;padding:15px;background:#fff;margin-bottom:10px;';
        stats.innerHTML = `
            <div style="text-align:center;"><div style="font-weight:bold;">${user.stats.posts}</div><div style="font-size:12px;color:#999;">发帖</div></div>
            <div style="text-align:center;"><div style="font-weight:bold;">${user.stats.replies}</div><div style="font-size:12px;color:#999;">回帖</div></div>
            <div style="text-align:center;"><div style="font-weight:bold;">${user.stats.likes}</div><div style="font-size:12px;color:#999;">获赞</div></div>
        `;
        container.appendChild(stats);

        // Menu
        const menu = document.createElement('div');
        menu.style.background = '#fff';
        const items = [
            {icon: 'fa-file-alt', text: '我的帖子', action: () => this.showMyPosts()},
            {icon: 'fa-comment-dots', text: '我的回复', action: () => this.showMyReplies()},
            {icon: 'fa-star', text: '我的收藏', action: () => this.showMyFavorites()},
            {icon: 'fa-history', text: '浏览历史', action: () => this.showHistory()}
        ];
        
        items.forEach(item => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:15px;border-bottom:1px solid #eee;display:flex;align-items:center;cursor:pointer;';
            div.innerHTML = `<i class="fas ${item.icon}" style="width:30px;color:#333;"></i><span>${item.text}</span><i class="fas fa-chevron-right" style="margin-left:auto;color:#ccc;"></i>`;
            div.onclick = item.action;
            menu.appendChild(div);
        });
        container.appendChild(menu);

        // Avatar Change Logic
        header.querySelector('#forumUserAvatar').onclick = () => {
            header.querySelector('#forumAvatarInput').click();
        };
        
        header.querySelector('#forumAvatarInput').onchange = async (e) => {
            const file = e.target.files[0];
            if(file) {
                try {
                    const id = await window.db.saveImage(file);
                    this.store.update(d => {
                        d.user.avatar = id;
                    });
                    this.renderMe();
                    alert('头像更换成功！');
                } catch(err) {
                    console.error('Avatar save failed', err);
                    alert('头像保存失败');
                }
            }
        };

        // Edit Profile Logic
        header.querySelector('#editProfileBtn').onclick = () => {
            const newName = prompt('修改昵称:', user.name);
            if(newName) {
                const newSig = prompt('修改签名:', user.signature);
                this.store.update(d => {
                    d.user.name = newName;
                    if(newSig) d.user.signature = newSig;
                });
                this.renderMe();
            }
        };
    }

    showMyPosts() {
        this.renderPostList('我的帖子', this.store.get().posts.filter(p => p.author === this.store.get().user.name));
    }
    showMyReplies() {
        const myName = this.store.get().user.name;
        const posts = this.store.get().posts.filter(p => p.comments.some(c => c.author === myName));
        this.renderPostList('我的回复', posts);
    }
    showMyFavorites() {
        const likedIds = this.store.get().user.history.favorites || [];
        const posts = this.store.get().posts.filter(p => likedIds.includes(p.id));
        this.renderPostList('我的收藏', posts);
    }
    showHistory() {
        const viewedIds = this.store.get().user.history.viewed || [];
        const posts = this.store.get().posts.filter(p => viewedIds.includes(p.id));
        this.renderPostList('浏览历史', posts);
    }

    renderPostList(title, posts) {
        const modal = document.createElement('div');
        modal.className = 'sub-page';
        modal.style.display = 'flex';
        modal.style.background = '#f5f5f5';
        
        modal.innerHTML = `
            <div class="sub-header">
                <button class="back-btn" onclick="this.closest('.sub-page').remove()"><i class="fas fa-chevron-left"></i></button>
                <span class="sub-title">${title}</span>
            </div>
            <div style="flex:1;overflow-y:auto;padding:10px;"></div>
        `;
        
        const list = modal.querySelector('div[style*="overflow-y:auto"]');
        if(posts.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">暂无内容</div>';
        } else {
            posts.forEach(p => {
                const div = document.createElement('div');
                div.className = 'forum-post';
                div.innerHTML = `
                    <div class="forum-post-title">${p.title}</div>
                    <div class="forum-post-meta">
                        <span>${p.author}</span>
                        <span>${new Date(p.time).toLocaleDateString()}</span>
                    </div>
                `;
                div.onclick = () => this.openPost(p);
                list.appendChild(div);
            });
        }
        
        document.getElementById('forumApp').appendChild(modal);
    }

    openPost(post) {
        try {
        // Add to history
        this.store.update(d => {
            if(!d.user.history.viewed.includes(post.id)) d.user.history.viewed.push(post.id);
        });

        const modal = document.createElement('div');
        modal.className = 'forum-detail-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#f5f5f5;z-index:2000;display:flex;flex-direction:column;';
        
        let avatar = post.authorAvatar;
        if(avatar && avatar.startsWith('img_')) {
            window.db.getImage(avatar).then(url => {
                const el = modal.querySelector('.post-avatar');
                if(el) el.style.backgroundImage = `url('${url}')`;
            });
        } else {
            avatar = window.Utils.generateDefaultAvatar(post.author);
        }

        let postImageHtml = '';
        if(post.image) {
            // Check if image is ID or URL
            if(post.image.startsWith('img_')) {
                window.db.getImage(post.image).then(url => {
                    const img = modal.querySelector('.post-image');
                    if(img) img.src = url;
                });
                postImageHtml = `<img class="post-image" src="" style="width:100%;border-radius:8px;margin-bottom:15px;">`;
            } else {
                postImageHtml = `<img src="${post.image}" style="width:100%;border-radius:8px;margin-bottom:15px;">`;
            }
        }

        let pollHtml = '';
        if(post.poll) {
            const options = post.poll.options.map((opt, idx) => `
                <div class="poll-option" style="padding:10px;background:#eee;margin-bottom:5px;border-radius:5px;cursor:pointer;" onclick="alert('投票成功')">
                    ${opt}
                </div>
            `).join('');
            pollHtml = `
                <div style="background:#fff;padding:15px;border-radius:8px;margin-bottom:15px;border:1px solid #eee;">
                    <div style="font-weight:bold;margin-bottom:10px;">📊 ${post.poll.question}</div>
                    ${options}
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="forum-header" style="background:#fff;padding:15px;display:flex;align-items:center;border-bottom:1px solid #eee;">
                <i class="fas fa-arrow-left" style="cursor:pointer;padding:10px;margin-left:-10px;" id="closePostDetail"></i>
                <span style="font-weight:bold;flex:1;text-align:center;">帖子详情</span>
                <div style="width:30px;"></div>
            </div>
            <div class="forum-content" style="flex:1;overflow-y:auto;padding:15px;background:white;">
                <h2 style="margin-top:0;">${post.title}</h2>
                <div style="display:flex;align-items:center;margin-bottom:15px;">
                    <div class="post-avatar" style="width:30px;height:30px;border-radius:50%;background-image:url('${avatar}');background-size:cover;margin-right:10px;"></div>
                    <div style="flex:1;">
                        <div style="font-weight:bold;font-size:14px;">${post.author}</div>
                        <div style="color:#999; font-size:12px;">${new Date(post.time).toLocaleString()}</div>
                    </div>
                    <button id="postFollowBtn" style="border:1px solid #333;background:none;border-radius:15px;padding:2px 10px;font-size:12px;">关注</button>
                </div>
                ${postImageHtml}
                <div style="line-height:1.6;margin-bottom:20px;">${post.content}</div>
                ${pollHtml}
                <div style="display:flex;gap:15px;padding:10px 0;border-top:1px solid #eee;border-bottom:1px solid #eee;flex-wrap:wrap;">
                    <span id="likeBtn" style="cursor:pointer;color:${false?'red':'#666'}"><i class="far fa-thumbs-up"></i> ${post.likes||0}</span>
                    <span id="favBtn" style="cursor:pointer;color:#666"><i class="far fa-star"></i> 收藏</span>
                    <span id="shareBtn" style="cursor:pointer;color:#666;margin-left:auto;"><i class="fas fa-share"></i> 转发</span>
                </div>
                <div style="margin-top:20px;">
                    <h3>评论</h3>
                    <div id="postComments"></div>
                </div>
            </div>
            <div style="padding:10px; background:white; border-top:1px solid #eee; display:flex; gap:10px;">
                <input id="postCommentInput" style="flex:1; padding:8px; border:1px solid #ddd; border-radius:4px;" placeholder="发表评论...">
                <button id="postCommentBtn" class="shop-btn buy">发送</button>
            </div>
        `;
        document.getElementById('forumApp').appendChild(modal);
        
        const renderComments = () => {
            const list = modal.querySelector('#postComments');
            list.innerHTML = '';
            if(post.comments.length === 0) list.innerHTML = '<div style="color:#999;">暂无评论</div>';
            post.comments.forEach(c => {
                const div = document.createElement('div');
                div.className = 'forum-comment';
                div.style.cssText = 'padding:10px 0; border-bottom:1px solid #f5f5f5;';
                div.innerHTML = `
                    <div style="display:flex;justify-content:space-between;">
                        <div style="font-weight:bold;font-size:12px;color:#333;">${c.author}</div>
                        <div style="font-size:10px;color:#999;cursor:pointer;" class="reply-comment-btn">回复</div>
                    </div>
                    <div style="color:#666;margin-top:2px;">${c.content}</div>
                `;
                div.querySelector('.reply-comment-btn').onclick = () => {
                    const input = modal.querySelector('#postCommentInput');
                    input.value = `回复 ${c.author}: `;
                    input.focus();
                };
                list.appendChild(div);
            });
        };
        renderComments();

        modal.querySelector('#closePostDetail').onclick = () => modal.remove();
        
        modal.querySelector('#postFollowBtn').onclick = function() {
            const isFollowed = this.innerText === '已关注';
            this.innerText = isFollowed ? '关注' : '已关注';
            this.style.background = isFollowed ? 'none' : '#333';
            this.style.color = isFollowed ? '#333' : '#fff';
        };

        modal.querySelector('#shareBtn').onclick = () => {
            if(window.QQApp && window.QQApp.showActionSheet) {
                const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
                const options = [
                    {
                        text: '转发给好友',
                        handler: () => {
                            if(qqData.friends.length === 0) return alert('暂无好友');
                            const names = qqData.friends.map((f, i) => `${i+1}. ${f.name}`).join('\n');
                            const choice = prompt(`选择好友:\n${names}`);
                            const idx = parseInt(choice) - 1;
                            if(idx >= 0 && idx < qqData.friends.length) {
                                const friend = qqData.friends[idx];
                                if(!qqData.messages[friend.id]) qqData.messages[friend.id] = [];
                                qqData.messages[friend.id].push({
                                    id: Date.now(), senderId: 'user', senderName: '我', 
                                    content: `[分享帖子] ${post.title}\n${post.content.substring(0, 50)}...`, type: 'text', timestamp: Date.now(), status: 'normal'
                                });
                                localStorage.setItem('qq_data', JSON.stringify(qqData));
                                alert('分享成功');
                            }
                        }
                    }
                ];
                window.QQApp.showActionSheet(options);
            } else {
                alert('分享功能需要 QQ 组件支持');
            }
        };

        modal.querySelector('#likeBtn').onclick = () => {
            this.store.update(d => {
                const p = d.posts.find(x => x.id === post.id);
                if(p) { p.likes = (p.likes||0) + 1; d.user.stats.likes++; }
            });
            post.likes = (post.likes||0) + 1;
            modal.querySelector('#likeBtn').innerHTML = `<i class="fas fa-thumbs-up"></i> ${post.likes}`;
        };

        modal.querySelector('#postCommentBtn').onclick = async () => {
            const input = modal.querySelector('#postCommentInput');
            const text = input.value.trim();
            if(!text) return;
            
            const data = this.store.get();
            const newComment = { author: data.user.name, content: text, time: Date.now() };
            
            this.store.update(d => {
                const p = d.posts.find(x => x.id === post.id);
                if(p) p.comments.push(newComment);
                d.user.stats.replies++;
                d.user.history.replies.push(post.id);
            });
            post.comments.push(newComment);
            input.value = '';
            renderComments();

            // AI Reply
            const apiConfig = window.API.getConfig();
            if(apiConfig.chatApiKey) {
                const prompt = `用户在论坛帖子"${post.title}"下评论: "${text}"。\n请生成 1-2 条其他用户的回复。返回JSON数组: [{"author": "昵称", "content": "回复"}]`;
                try {
                    const res = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
                    const replies = window.Utils.safeParseJSON(res);
                    if(Array.isArray(replies)) {
                        this.store.update(d => {
                            const p = d.posts.find(x => x.id === post.id);
                            if(p) replies.forEach(r => p.comments.push(r));
                        });
                        replies.forEach(r => post.comments.push(r));
                        renderComments();
                    }
                } catch(e) {}
            }
        };
        } catch(e) {
            console.error(e);
            alert('打开帖子失败: ' + e.message);
        }
    }

    sharePost(postId) {
        const post = this.store.get().posts.find(p => p.id === postId);
        if(post) {
            // Reuse openPost logic but maybe just copy link?
            // For now, just alert
            alert('已复制帖子链接');
        }
    }

    buyMarketItem(item) {
        window.Utils.showCustomDialog({
            title: '购买商品',
            content: `商品: ${item.title}\n价格: ¥${item.price}`,
            buttons: [
                { text: '直接购买 (余额)', class: 'confirm', value: 'balance' },
                { text: '找人代付', class: 'confirm', value: 'payfor' },
                { text: '取消', class: 'cancel', value: false }
            ]
        }).then(res => {
            if(res.action === 'balance') {
                const qqData = JSON.parse(localStorage.getItem('qq_data'));
                if(parseFloat(qqData.wallet.balance) < item.price) return alert('余额不足');
                
                qqData.wallet.balance = (parseFloat(qqData.wallet.balance) - parseFloat(item.price)).toFixed(2);
                qqData.wallet.history.unshift({date: new Date().toLocaleString(), amount: `-${item.price}`, reason: `论坛交易: ${item.title}`});
                localStorage.setItem('qq_data', JSON.stringify(qqData));
                
                this.completePurchase(item);
            } else if (res.action === 'payfor') {
                this.handlePayFor(item);
            }
        });
    }

    completePurchase(item) {
        this.store.update(d => {
            const i = d.marketItems.find(x => x.id === item.id);
            if(i) i.status = 'sold';
        });
        this.renderMarket();
        alert('购买成功');
        
        this.startChatWithUser(item.seller);
        const data = this.store.get();
        const chat = data.chats.find(c => c.userName === item.seller);
        if(chat) {
            chat.messages.push({sender: 'user', content: `你好，我拍下了你的 ${item.title}`, time: Date.now()});
            this.store.set(data);
        }
    }

    handlePayFor(item) {
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        if(qqData.friends.length === 0) return alert('暂无好友可代付');
        
        const names = qqData.friends.map((f, i) => `${i+1}. ${f.name}`).join('\n');
        const choice = prompt(`选择代付好友:\n${names}`);
        const idx = parseInt(choice) - 1;
        
        if(idx >= 0 && idx < qqData.friends.length) {
            const friend = qqData.friends[idx];
            this.processPayFor(friend, item);
        }
    }

    async processPayFor(friend, item) {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        alert('正在发送代付请求...');
        
        const prompt = `你扮演 ${friend.name}。\n人设: ${friend.persona}\n用户请求你代付一件商品。\n商品: ${item.title}\n价格: ${item.price}\n请根据你的人设决定是否同意代付。\n如果同意，请回复 JSON: {"agreed": true, "reply": "同意的回复内容"}\n如果拒绝，请回复 JSON: {"agreed": false, "reply": "拒绝的回复内容"}`;
        
        try {
            const res = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
            const result = window.Utils.safeParseJSON(res);
            
            // Add message to QQ
            const qqData = JSON.parse(localStorage.getItem('qq_data'));
            if(!qqData.messages[friend.id]) qqData.messages[friend.id] = [];
            
            // User request
            qqData.messages[friend.id].push({
                id: Date.now(), senderId: 'user', senderName: '我', 
                content: `[代付请求] ${item.title} (¥${item.price})`, type: 'system_card', subType: 'payforme', data: item.price, timestamp: Date.now(), status: 'normal'
            });
            
            // Friend reply
            qqData.messages[friend.id].push({
                id: Date.now()+1, senderId: friend.id, senderName: friend.name, 
                content: result.reply, type: 'text', timestamp: Date.now(), status: 'normal'
            });
            
            localStorage.setItem('qq_data', JSON.stringify(qqData));
            
            if(result.agreed) {
                this.completePurchase(item);
                if(Notification.permission === 'granted') new Notification(friend.name, {body: result.reply});
            } else {
                alert(`代付失败: ${friend.name} 拒绝了请求`);
            }
            
        } catch(e) {
            console.error(e);
            alert('请求失败');
        }
    }
    
    openMarketItem(item) {
        const modal = document.createElement('div');
        modal.className = 'sub-page';
        modal.style.display = 'flex';
        modal.style.zIndex = '2000';
        modal.style.background = '#f5f5f5';
        
        let imgUrl = window.Utils.generateDefaultImage(item.title);

        modal.innerHTML = `
            <div class="sub-header">
                <button class="back-btn" id="closeMarketDetail"><i class="fas fa-chevron-left"></i></button>
                <span class="sub-title">商品详情</span>
                <i class="fas fa-share-alt" id="shareMarketBtn" style="cursor:pointer;"></i>
            </div>
            <div class="sub-content" style="padding:0;background:#fff;">
                <img src="${imgUrl}" style="width:100%;height:auto;display:block;">
                <div style="padding:15px;">
                    <div style="color:#ff5000;font-size:24px;font-weight:bold;">¥${item.price}</div>
                    <div style="font-size:18px;font-weight:bold;margin:10px 0;">${item.title}</div>
                    <div style="display:flex;justify-content:space-between;color:#999;font-size:12px;margin-bottom:15px;">
                        <span>卖家: ${item.seller}</span>
                        <span>担保交易</span>
                    </div>
                    <div style="border-top:10px solid #f5f5f5;margin:0 -15px;padding:15px;">
                        <div style="font-weight:bold;margin-bottom:10px;">商品描述</div>
                        <div style="color:#666;line-height:1.6;">${item.desc}</div>
                    </div>
                </div>
            </div>
            <div style="padding:10px;background:#fff;border-top:1px solid #eee;display:flex;gap:10px;align-items:center;">
                <div style="display:flex;flex-direction:column;align-items:center;font-size:10px;color:#666;cursor:pointer;flex:1;" id="marketChatBtn">
                    <i class="fas fa-comment-dots" style="font-size:20px;color:#999;"></i>
                    私信卖家
                </div>
                ${item.status !== 'sold' ? '<button class="shop-btn buy" id="marketBuyBtn" style="flex:2;">立即购买</button>' : '<button class="shop-btn" disabled style="flex:2;background:#ccc;">已售出</button>'}
            </div>
        `;
        document.getElementById('forumApp').appendChild(modal);

        modal.querySelector('#closeMarketDetail').onclick = () => modal.remove();
        
        modal.querySelector('#shareMarketBtn').onclick = () => {
            const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
            if(qqData.friends.length === 0) return alert('暂无QQ好友可分享');
            
            const names = qqData.friends.map((f, i) => `${i+1}. ${f.name}`).join('\n');
            const choice = prompt(`分享商品 "${item.title}" 给谁？(输入序号)\n${names}`);
            const idx = parseInt(choice) - 1;
            
            if(idx >= 0 && idx < qqData.friends.length) {
                const friend = qqData.friends[idx];
                if(!qqData.messages[friend.id]) qqData.messages[friend.id] = [];
                qqData.messages[friend.id].push({
                    id: Date.now(), senderId: 'user', senderName: '我', 
                    content: `[分享闲置] ${item.title}\n价格: ¥${item.price}`, type: 'text', timestamp: Date.now(), status: 'normal'
                });
                localStorage.setItem('qq_data', JSON.stringify(qqData));
                alert(`已分享给 ${friend.name}`);
            }
        };
        
        modal.querySelector('#marketChatBtn').onclick = () => this.startChatWithUser(item.seller);
        if(item.status !== 'sold') {
            modal.querySelector('#marketBuyBtn').onclick = () => {
                this.buyMarketItem(item);
                modal.remove();
            };
        }
    }

    renderChatList() {
        const list = document.getElementById('forumChatList');
        list.innerHTML = '';
        const data = this.store.get();
        const chats = data.chats || [];

        if(chats.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">暂无私信</div>';
            return;
        }

        chats.forEach(chat => {
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = `
                <div class="chat-avatar" style="background:#6c5ce7;color:#fff;display:flex;justify-content:center;align-items:center;"><i class="fas fa-user"></i></div>
                <div class="chat-info">
                    <div class="chat-top"><span class="chat-name">${chat.userName}</span></div>
                    <div class="chat-msg">${chat.messages[chat.messages.length-1]?.content || ''}</div>
                </div>
            `;
            div.onclick = () => this.openChat(chat);
            list.appendChild(div);
        });
    }

    openChat(chat) {
        const modal = document.createElement('div');
        modal.className = 'sub-page';
        modal.style.display = 'flex';
        modal.style.zIndex = '100';
        modal.innerHTML = `
            <div class="sub-header">
                <button class="back-btn" id="closeForumChat"><i class="fas fa-chevron-left"></i></button>
                <span class="sub-title">${chat.userName}</span>
                <button class="action-btn secondary" id="bargainBtn" style="width:auto;padding:5px 10px;margin-left:auto;">砍价</button>
            </div>
            <div class="chat-messages" id="forumChatMessages" style="flex:1;overflow-y:auto;padding:10px;"></div>
            <div class="chat-input-area">
                <input id="forumChatInput" placeholder="发送消息...">
                <button class="send-btn" id="forumChatSend">发送</button>
                <button class="chat-reply-btn" id="forumChatReply" style="margin-left:5px;">回复</button>
            </div>
        `;
        document.getElementById('forumApp').appendChild(modal);

        const renderMsgs = () => {
            const container = modal.querySelector('#forumChatMessages');
            container.innerHTML = '';
            chat.messages.forEach(m => {
                const div = document.createElement('div');
                div.className = `message-row ${m.sender === 'user' ? 'self' : ''}`;
                div.innerHTML = `<div class="msg-content"><div class="msg-bubble">${m.content}</div></div>`;
                container.appendChild(div);
            });
            container.scrollTop = container.scrollHeight;
        };
        renderMsgs();

        modal.querySelector('#closeForumChat').onclick = () => modal.remove();
        
        const sendMsg = async (isReply = false) => {
            const input = modal.querySelector('#forumChatInput');
            const text = input.value.trim();
            if(!text && !isReply) return;
            
            if(!isReply) {
                chat.messages.push({sender: 'user', content: text, time: Date.now()});
                this.store.set(this.store.get());
                renderMsgs();
                input.value = '';
            }

            if(isReply) {
                 const apiConfig = window.API.getConfig();
                 if(apiConfig.chatApiKey) {
                     const prompt = `你扮演论坛用户 "${chat.userName}"。\n用户说: "${chat.messages[chat.messages.length-1].content}"。\n请回复用户。`;
                     try {
                         const reply = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
                         chat.messages.push({sender: 'other', content: reply, time: Date.now()});
                         this.store.set(this.store.get());
                         renderMsgs();
                     } catch(e) { alert('生成失败'); }
                 }
            }
        };

        modal.querySelector('#forumChatSend').onclick = () => sendMsg(false);
        modal.querySelector('#forumChatReply').onclick = () => sendMsg(true);
        
        modal.querySelector('#bargainBtn').onclick = async () => {
            const price = prompt('请输入你想砍到的价格:');
            if(price) {
                chat.messages.push({sender: 'user', content: `老板，${price}卖不卖？`, time: Date.now()});
                this.store.set(this.store.get());
                renderMsgs();
                
                // AI Reply
                const apiConfig = window.API.getConfig();
                if(apiConfig.chatApiKey) {
                    const prompt = `你扮演论坛卖家 "${chat.userName}"。\n用户想砍价到 ${price}。\n请根据你的心情决定是否接受，并回复用户。`;
                    try {
                        const reply = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
                        chat.messages.push({sender: 'other', content: reply, time: Date.now()});
                        this.store.set(this.store.get());
                        renderMsgs();
                    } catch(e) {}
                }
            }
        };
    }

    startChatWithUser(userName) {
        const data = this.store.get();
        if(!data.chats) data.chats = [];
        let chat = data.chats.find(c => c.userName === userName);
        if(!chat) {
            chat = { userName, messages: [] };
            data.chats.push(chat);
            this.store.set(data);
        }
        this.openChat(chat);
    }

    async generateActivity() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return;

        const settings = this.store.get().settings;
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        const friends = qqData.friends;

        // Randomly choose between posting or commenting
        const action = Math.random() > 0.5 ? 'post' : 'comment';

        if (action === 'post') {
            // Generate a new post from a random friend
            const friend = friends[Math.floor(Math.random() * friends.length)];
            if (!friend) return;

            const prompt = `你扮演 ${friend.name}。人设: ${friend.persona}\n请生成一条你在论坛发布的帖子。\n要求：标题吸引人，内容真实，符合人设。\n返回 JSON: {"title": "标题", "content": "正文"}`;

            try {
                const res = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
                const post = window.Utils.safeParseJSON(res);

                if (post && post.title) {
                    const avatarBase64 = window.Utils.generateDefaultAvatar(friend.name);
                    const avatar = await window.db.saveImage(avatarBase64);
                    const imgBase64 = window.Utils.generateDefaultImage(post.title);
                    const imgId = await window.db.saveImage(imgBase64);

                    this.store.update(d => {
                        d.posts.unshift({
                            id: window.Utils.generateId('post'),
                            boardId: 'general',
                            title: post.title,
                            content: post.content,
                            author: friend.name,
                            authorAvatar: avatar,
                            time: Date.now(),
                            likes: 0,
                            poll: null,
                            comments: [],
                            image: imgId
                        });
                    });

                    if (Notification.permission === 'granted') {
                        new Notification('论坛', { body: `${friend.name} 发布了新帖子` });
                    }
                }
            } catch(e) {
                console.error('Forum activity generation failed', e);
            }
        }
    }

    openSettings() {
        const settings = this.store.get().settings;
        const modal = document.createElement('div');
        modal.className = 'sub-page';
        modal.style.display = 'flex';
        modal.style.zIndex = '100';
        modal.innerHTML = `
            <div class="sub-header">
                <button class="back-btn" onclick="this.closest('.sub-page').remove()"><i class="fas fa-chevron-left"></i></button>
                <span class="sub-title">论坛设置</span>
            </div>
            <div class="sub-content form-content">
                <div class="form-group">
                    <label>世界观设定</label>
                    <textarea id="forumWorldSetting" style="height:100px;">${settings.worldSetting || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>论坛规则</label>
                    <textarea id="forumRules" style="height:100px;">${settings.rules || ''}</textarea>
                </div>
                <button class="action-btn" id="saveForumSettings">保存</button>
                <div style="margin-top:20px;display:flex;gap:10px;">
                    <button class="action-btn secondary" id="exportForumSettings">导出设定</button>
                    <button class="action-btn secondary" id="importForumSettings">导入设定</button>
                    <input type="file" id="importForumInput" hidden accept=".json">
                </div>
            </div>
        `;
        document.getElementById('forumApp').appendChild(modal);

        modal.querySelector('#saveForumSettings').onclick = () => {
            this.store.update(d => {
                d.settings.worldSetting = document.getElementById('forumWorldSetting').value;
                d.settings.rules = document.getElementById('forumRules').value;
            });
            alert('保存成功');
            modal.remove();
        };

        modal.querySelector('#exportForumSettings').onclick = () => {
            const s = this.store.get().settings;
            const blob = new Blob([JSON.stringify(s, null, 2)], {type: 'application/json'});
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'forum_settings.json'; a.click();
        };

        modal.querySelector('#importForumSettings').onclick = () => document.getElementById('importForumInput').click();
        modal.querySelector('#importForumInput').onchange = (e) => {
            const file = e.target.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const s = JSON.parse(evt.target.result);
                        this.store.update(d => d.settings = s);
                        alert('导入成功');
                        modal.remove();
                    } catch(err) { alert('格式错误'); }
                };
                reader.readAsText(file);
            }
        };
    }
}

window.ForumApp = new ForumApp();
