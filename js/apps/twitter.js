class TwitterStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('twitter_data')) {
            const initialData = {
                currentAccountId: 'main',
                accounts: [
                    { id: 'main', name: '我', handle: '@me', avatar: '', bio: 'Hello World', following: 10, followers: 5, verified: false }
                ],
                tweets: [], // {id, accountId, text, time, likes, retweets, replies, isAI, aiName, aiHandle, aiAvatar, images:[], quoteId:null, comments:[]}
                dms: [], // {id, participant: {name, handle, avatar}, messages: [{sender:'me'|'them', text, time}], isFriend: false}
                settings: {
                    worldSetting: '现代社会',
                    npcs: [], // {id, name, handle, avatar, bio}
                    boundRoles: [], // {qqId, twitterHandle} - 记忆互通
                    enabledRoles: [], // {qqId, twitterHandle} - 记忆不互通
                    postMemory: 0
                }
            };
            localStorage.setItem('twitter_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('twitter_data')); }
    set(data) { localStorage.setItem('twitter_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class TwitterApp {
    constructor() {
        this.store = new TwitterStore();
        this.currentDmTab = 'friends'; // friends, requests
        this.initUI();
    }

    initUI() {
        // Check Phone Check Mode
        if (window.System && window.System.isPhoneCheckMode) {
            if(!document.getElementById('tGenActivityBtn')) {
                const btn = document.createElement('div');
                btn.id = 'tGenActivityBtn';
                btn.className = 'ff-fab';
                btn.style.bottom = '80px';
                btn.style.background = '#1d9bf0';
                btn.innerHTML = '<i class="fas fa-magic"></i>';
                btn.onclick = () => this.generateActivity();
                document.getElementById('twitterApp').appendChild(btn);
            }
        }

        if(!document.querySelector('.t-drawer')) {
            const drawer = document.createElement('div');
            drawer.className = 't-drawer';
            drawer.id = 'tDrawer';
            drawer.innerHTML = `
                <div class="t-drawer-header">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div class="t-drawer-avatar" id="drawerAvatar"></div>
                        <div class="t-account-switcher-icon" id="btnSwitchAccount"><i class="fas fa-ellipsis-v"></i></div>
                    </div>
                    <div class="t-drawer-name" id="drawerName">Name</div>
                    <div class="t-drawer-handle" id="drawerHandle">@handle</div>
                    <div class="t-drawer-stats">
                        <span><b id="drawerFollowing">0</b> Following</span>
                        <span><b id="drawerFollowers">0</b> Followers</span>
                    </div>
                </div>
                <div class="t-drawer-menu">
                    <div class="t-drawer-item" id="btnProfile"><i class="far fa-user"></i> Profile</div>
                    <div class="t-drawer-item"><i class="fas fa-list"></i> Lists</div>
                    <div class="t-drawer-item"><i class="far fa-bookmark"></i> Bookmarks</div>
                    <div class="t-drawer-item" id="btnSettings"><i class="fas fa-cog"></i> Settings</div>
                </div>
                <div class="t-drawer-footer">
                    <i class="fas fa-lightbulb"></i>
                    <i class="fas fa-qrcode"></i>
                </div>
                
                <div id="tAccountSwitcher" style="display:none; position:absolute; top:60px; right:10px; background:white; border:1px solid #eee; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.1); width:200px; z-index:10;">
                    <div id="tAccountList" style="max-height:200px; overflow-y:auto;"></div>
                    <div class="t-drawer-item" id="btnAddAccount" style="border-top:1px solid #eee;"><i class="fas fa-plus"></i> Add existing account</div>
                </div>
            `;
            const overlay = document.createElement('div');
            overlay.className = 't-drawer-overlay';
            overlay.id = 'tDrawerOverlay';
            overlay.onclick = () => this.closeDrawer();
            
            document.getElementById('twitterApp').appendChild(overlay);
            document.getElementById('twitterApp').appendChild(drawer);
        }

        if(!document.getElementById('tDmWindow')) {
            const dmWin = document.createElement('div');
            dmWin.id = 'tDmWindow';
            dmWin.className = 't-dm-window';
            dmWin.innerHTML = `
                <div class="t-dm-header">
                    <div class="t-dm-back" id="closeDmWin"><i class="fas fa-arrow-left"></i></div>
                    <div class="t-dm-header-info">
                        <div class="t-dm-header-name" id="dmHeaderName">Name</div>
                        <div class="t-dm-header-handle" id="dmHeaderHandle">@handle</div>
                    </div>
                    <div class="t-header-icon" id="btnGenDmReply"><i class="fas fa-magic"></i></div>
                </div>
                <div class="t-dm-messages" id="dmMessages"></div>
                <div class="t-dm-input">
                    <i class="far fa-image" style="color:#1d9bf0;font-size:20px;"></i>
                    <input type="text" id="dmInput" placeholder="Start a message">
                    <div class="t-dm-send" id="dmSendBtn"><i class="fas fa-paper-plane"></i></div>
                </div>
            `;
            document.getElementById('twitterApp').appendChild(dmWin);
            
            document.getElementById('closeDmWin').onclick = () => dmWin.style.display = 'none';
            document.getElementById('btnGenDmReply').onclick = () => this.generateDMReply();
            document.getElementById('dmSendBtn').onclick = () => this.sendDM();
            document.getElementById('dmInput').onkeydown = (e) => { if(e.key === 'Enter') this.sendDM(); };
        }

        // Tweet Detail Modal
        if(!document.getElementById('tTweetDetail')) {
            const detail = document.createElement('div');
            detail.id = 'tTweetDetail';
            detail.className = 'sub-page';
            detail.style.display = 'none';
            detail.style.zIndex = '60';
            detail.innerHTML = `
                <div class="sub-header">
                    <button class="back-btn" id="closeTweetDetail"><i class="fas fa-arrow-left"></i></button>
                    <span class="sub-title">Tweet</span>
                </div>
                <div id="tDetailContent" style="overflow-y:auto; height:calc(100% - 50px);"></div>
                <div style="padding:10px; background:white; border-top:1px solid #eee; display:flex; gap:10px;">
                    <input id="tweetReplyInput" style="flex:1; padding:8px; border:1px solid #ddd; border-radius:20px;" placeholder="Tweet your reply">
                    <button id="tweetReplyBtn" class="send-btn" style="background:#1d9bf0;border-radius:20px;">Reply</button>
                </div>
            `;
            document.getElementById('twitterApp').appendChild(detail);
            document.getElementById('closeTweetDetail').onclick = () => detail.style.display = 'none';
        }

        // Ensure Post Modal exists and has correct structure (Fix missing button issue)
        const existingPostModal = document.getElementById('tPostModal');
        if(existingPostModal) existingPostModal.remove();
        
        const postModal = document.createElement('div');
        postModal.id = 'tPostModal';
        postModal.className = 'sub-page';
        postModal.style.display = 'none';
        postModal.style.zIndex = '70'; // Higher z-index
        postModal.innerHTML = `
            <div class="sub-header" style="display:flex; justify-content:space-between; align-items:center; padding:10px;">
                <button class="back-btn" id="closeTPost" style="border:none; background:none; font-size:16px;">取消</button>
                <button class="send-btn" id="doTPost" style="background:#1d9bf0; color:white; border:none; border-radius:20px; padding:5px 15px; font-weight:bold;">发布</button>
            </div>
            <div style="padding:15px;">
                <textarea id="tPostInput" placeholder="有什么新鲜事？" style="width:100%; height:150px; border:none; outline:none; font-size:18px; resize:none; font-family:inherit;"></textarea>
            </div>
        `;
        document.getElementById('twitterApp').appendChild(postModal);
        document.getElementById('closeTPost').onclick = () => postModal.style.display = 'none';
        document.getElementById('doTPost').onclick = () => this.createPost();

        // Update Header with Gen Button
        const header = document.querySelector('.t-header');
        header.innerHTML = `
            <div class="t-avatar-small" id="tAvatarSmall"></div>
            <div class="t-logo">X</div>
            <div style="display:flex;gap:15px;margin-left:auto;">
                <div class="t-header-icon" id="tHeaderGenBtn"><i class="fas fa-plus"></i></div>
                <div class="t-header-icon" id="tHeaderSettings"><i class="fas fa-cog"></i></div>
            </div>
            <div class="account-switcher" id="accountSwitcher"><div id="accountList"></div></div>
        `;
        
        document.getElementById('tHeaderGenBtn').onclick = () => this.generateTimeline();
        document.getElementById('tHeaderSettings').onclick = () => { this.closeDrawer(); this.openSettings(); };
        
        document.querySelectorAll('.t-nav-item').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.t-nav-item').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.t-tab-page').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                const tabId = btn.dataset.tab;
                document.getElementById(tabId).classList.add('active');
                
                if(tabId === 't-home') this.renderHome();
                if(tabId === 't-search') this.renderSearch();
                if(tabId === 't-messages') this.renderDMs();
            };
        });

        document.getElementById('tAvatarSmall').onclick = () => this.openDrawer();
        
        document.getElementById('btnProfile').onclick = () => { this.closeDrawer(); this.renderProfile('me'); };
        document.getElementById('btnSettings').onclick = () => { this.closeDrawer(); this.openSettings(); };
        
        document.getElementById('btnSwitchAccount').onclick = (e) => {
            e.stopPropagation();
            const switcher = document.getElementById('tAccountSwitcher');
            switcher.style.display = switcher.style.display === 'none' ? 'block' : 'none';
            this.renderAccountList();
        };
        document.getElementById('btnAddAccount').onclick = () => this.addAccount();

        document.getElementById('tFab').onclick = () => this.openPostModal();
        
        this.renderHome();
        this.updateHeaderAvatar();
    }

    openDrawer() {
        const data = this.store.get();
        const acc = data.accounts.find(a => a.id === data.currentAccountId);
        
        document.getElementById('drawerName').innerText = acc.name;
        document.getElementById('drawerHandle').innerText = acc.handle;
        document.getElementById('drawerFollowing').innerText = acc.following;
        document.getElementById('drawerFollowers').innerText = acc.followers;
        
        window.db.getImage(acc.avatar).then(url => {
            document.getElementById('drawerAvatar').style.backgroundImage = `url('${url || 'https://picsum.photos/100/100'}')`;
        });

        document.getElementById('tDrawer').classList.add('open');
        document.getElementById('tDrawerOverlay').classList.add('open');
    }

    closeDrawer() {
        document.getElementById('tDrawer').classList.remove('open');
        document.getElementById('tDrawerOverlay').classList.remove('open');
    }

    async updateHeaderAvatar() {
        const data = this.store.get();
        const acc = data.accounts.find(a => a.id === data.currentAccountId);
        let avatar = acc.avatar;
        if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
        document.getElementById('tAvatarSmall').style.backgroundImage = `url('${avatar || 'https://picsum.photos/50/50'}')`;
    }

    async renderHome() {
        const list = document.getElementById('tweetList');
        list.innerHTML = '';
        
        const data = this.store.get();
        let tweets = [...data.tweets].sort((a, b) => b.time - a.time);

        for(const t of tweets) {
            const div = await this.createTweetElement(t);
            list.appendChild(div);
        }
    }

    async createTweetElement(t) {
        const data = this.store.get();
        let account;
        let avatar;

        account = data.accounts.find(a => a.id === t.accountId);
        if (!account && t.isAI) {
            account = { name: t.aiName, handle: t.aiHandle, avatar: t.aiAvatar, verified: false };
        }
        if(!account) return document.createElement('div');
        
        avatar = account.avatar;
        if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
        else if (!avatar) avatar = window.Utils.generateDefaultAvatar(account.name);

        const div = document.createElement('div');
        div.className = 'tweet-item';
        
        const processedText = t.text.replace(/([#@]\w+)/g, '<span style="color:#1d9bf0;">$1</span>');

        let mediaHtml = '';
        if(t.images && t.images.length > 0) {
            let gridClass = `grid-${Math.min(t.images.length, 4)}`;
            let imgs = '';
            for(let i=0; i<Math.min(t.images.length, 4); i++) {
                let url = t.images[i];
                if(url.startsWith('img_')) url = await window.db.getImage(url);
                imgs += `<img src="${url}">`;
            }
            mediaHtml = `<div class="tweet-media ${gridClass}">${imgs}</div>`;
        }

        let quoteHtml = '';
        if(t.quoteId) {
            const q = data.tweets.find(x => x.id === t.quoteId);
            if(q) {
                quoteHtml = `
                    <div class="tweet-quote">
                        <div class="quote-header">
                            <div class="quote-avatar" style="background-image:url('${q.aiAvatar || ''}')"></div>
                            <span class="quote-name">${q.aiName || 'User'}</span>
                            <span class="quote-handle">${q.aiHandle || '@user'}</span>
                        </div>
                        <div class="tweet-text" style="font-size:14px;margin-bottom:0;">${q.text}</div>
                    </div>
                `;
            }
        }

        div.innerHTML = `
            <div class="tweet-avatar" style="background-image:url('${avatar}')"></div>
            <div class="tweet-content">
                <div class="tweet-header">
                    <span class="tweet-name">${account.name}</span>
                    ${account.verified ? '<i class="fas fa-certificate" style="color:#1d9bf0; font-size:12px; margin-right:5px;"></i>' : ''}
                    <span class="tweet-handle">${account.handle}</span>
                    <span class="tweet-time">${this.timeSince(t.time)}</span>
                </div>
                <div class="tweet-text">${processedText}</div>
                ${mediaHtml}
                ${quoteHtml}
                <div class="tweet-actions">
                    <div class="t-action-btn"><i class="far fa-comment"></i> <span>${t.replies || 0}</span></div>
                    <div class="t-action-btn retweet-btn"><i class="fas fa-retweet"></i> <span>${t.retweets || 0}</span></div>
                    <div class="t-action-btn like-btn"><i class="far fa-heart"></i> <span>${t.likes || 0}</span></div>
                    <div class="t-action-btn share-btn"><i class="fas fa-share"></i></div>
                </div>
            </div>
        `;
        
        div.onclick = () => this.openTweetDetail(t);
        
        div.querySelector('.tweet-avatar').onclick = (e) => {
            e.stopPropagation();
            this.renderProfile(t.isAI ? {name: t.aiName, handle: t.aiHandle, avatar: t.aiAvatar, bio: 'AI User'} : 'me');
        };

        div.querySelector('.like-btn').onclick = (e) => {
            e.stopPropagation();
            t.likes = (t.likes || 0) + 1;
            this.store.set(data);
            div.querySelector('.like-btn span').innerText = t.likes;
            div.querySelector('.like-btn').classList.add('liked');
            div.querySelector('.like-btn i').className = 'fas fa-heart';
        };

        div.querySelector('.share-btn').onclick = (e) => {
            e.stopPropagation();
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
                                    content: `[分享推文] ${account.name}: ${t.text.substring(0, 50)}...`, type: 'text', timestamp: Date.now(), status: 'normal'
                                });
                                localStorage.setItem('qq_data', JSON.stringify(qqData));
                                alert('分享成功');
                            }
                        }
                    },
                    {
                        text: '分享到QQ动态',
                        handler: () => {
                            qqData.moments.unshift({
                                id: Date.now(), userId: 'user', name: qqData.user.name, avatar: qqData.user.avatar,
                                text: `分享推文：${account.name} - ${t.text}`, timestamp: Date.now(), comments: [], likes: []
                            });
                            localStorage.setItem('qq_data', JSON.stringify(qqData));
                            alert('已发布到动态');
                        }
                    }
                ];
                window.QQApp.showActionSheet(options);
            } else {
                alert('分享功能需要 QQ 组件支持');
            }
        };

        return div;
    }

    async openTweetDetail(t) {
        const detail = document.getElementById('tTweetDetail');
        const content = document.getElementById('tDetailContent');
        content.innerHTML = '';
        
        const mainTweet = await this.createTweetElement(t);
        mainTweet.style.borderBottom = '1px solid #eff3f4';
        content.appendChild(mainTweet);
        
        const commentsDiv = document.createElement('div');
        commentsDiv.id = 'tweetComments';
        commentsDiv.style.padding = '0 15px';
        
        const renderComments = async () => {
            commentsDiv.innerHTML = '';
            if(t.comments && t.comments.length > 0) {
                for(const c of t.comments) {
                    const div = document.createElement('div');
                    div.className = 'tweet-item';
                    div.style.borderBottom = '1px solid #eff3f4';
                    
                    let avatar = window.Utils.generateDefaultAvatar(c.name);
                    if(c.avatar) avatar = c.avatar;
                    if(avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);

                    div.innerHTML = `
                        <div class="tweet-avatar" style="background-image:url('${avatar}')"></div>
                        <div class="tweet-content">
                            <div class="tweet-header">
                                <span class="tweet-name">${c.name}</span>
                                <span class="tweet-handle">${c.handle}</span>
                                <span class="tweet-time">${this.timeSince(c.time)}</span>
                            </div>
                            <div class="tweet-text">${c.text}</div>
                        </div>
                    `;
                    commentsDiv.appendChild(div);
                }
            } else {
                commentsDiv.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">暂无评论</div>';
            }
        };
        await renderComments();
        
        content.appendChild(commentsDiv);
        detail.style.display = 'flex';

        // Reply Logic
        const replyBtn = document.getElementById('tweetReplyBtn');
        const replyInput = document.getElementById('tweetReplyInput');
        
        replyBtn.onclick = async () => {
            const text = replyInput.value.trim();
            if(!text) return;
            
            const data = this.store.get();
            const acc = data.accounts.find(a => a.id === data.currentAccountId);
            
            const newComment = {
                name: acc.name,
                handle: acc.handle,
                text: text,
                time: Date.now(),
                avatar: acc.avatar
            };
            
            this.store.update(d => {
                const tweet = d.tweets.find(x => x.id === t.id);
                if(tweet) {
                    if(!tweet.comments) tweet.comments = [];
                    tweet.comments.push(newComment);
                    tweet.replies++;
                }
            });
            t.comments.push(newComment);
            replyInput.value = '';
            await renderComments();

            // AI Auto Reply
            const apiConfig = window.API.getConfig();
            if(apiConfig.chatApiKey) {
                const prompt = `用户回复了推文 "${t.text}"。\n用户说: "${text}"。\n请生成 1-2 条其他用户的回复或原推主的回复。返回JSON数组: [{"name": "User", "handle": "@user", "text": "Reply"}]`;
                try {
                    const res = await window.API.callAI(prompt, apiConfig);
                    const replies = JSON.parse(res);
                    if(Array.isArray(replies)) {
                        this.store.update(d => {
                            const tweet = d.tweets.find(x => x.id === t.id);
                            if(tweet) replies.forEach(r => tweet.comments.push({...r, time: Date.now()}));
                        });
                        replies.forEach(r => t.comments.push({...r, time: Date.now()}));
                        await renderComments();
                    }
                } catch(e) {}
            }
        };
    }

    async generateTimeline() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const btn = document.getElementById('tHeaderGenBtn');
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const settings = this.store.get().settings || {};
        const worldSetting = settings.worldSetting || '现代社会';
        
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        
        // Bound Roles (Memory Shared)
        const boundRoles = settings.boundRoles || [];
        const boundContext = boundRoles.map(b => {
            const f = qqData.friends.find(fr => fr.id === b.qqId);
            return f ? `${f.name} (Handle: ${b.twitterHandle}, 人设: ${f.persona}, 知道用户真实身份)` : '';
        }).filter(Boolean).join('; ');

        // Enabled Roles (Memory Isolated)
        const enabledRoles = settings.enabledRoles || [];
        const enabledContext = enabledRoles.map(b => {
            const f = qqData.friends.find(fr => fr.id === b.qqId);
            return f ? `${f.name} (Handle: ${b.twitterHandle}, 人设: ${f.persona}, 不认识用户，只当路人)` : '';
        }).filter(Boolean).join('; ');

        // Inject Global Memory
        const globalContext = window.MemoryManager.getGlobalContext();
        const memoryPrompt = `\n[最近发生的事]:\n${globalContext.recentChats.join('\n')}\n请根据这些近期聊天内容，让绑定角色发布相关的推文（例如吐槽刚才的聊天，或者分享心情）。\n`;

        const prompt = `基于世界观"${worldSetting}"，生成 12-15 条推特推文。
        ${memoryPrompt}
        要求：
        1. 极度拟人化：使用口语、缩写、网络梗、Emoji、情绪发泄、日常琐事。严禁 AI 味。
        2. 包含不同类型：纯文字、带图（提供图片描述）、引用推文（模拟）。
        3. 角色来源：
           - 绑定角色(知道用户): ${boundContext}
           - 开启角色(不认识用户): ${enabledContext}
           - 其他路人/大V
        4. 互动数据：生成真实的浏览量(views)、点赞(likes)、转发(retweets)、评论(replies)数量。
        5. 评论区：每条推文生成 2-3 条评论。
        6. 返回 JSON 数组：
        [
            {
                "name": "用户名", "handle": "@handle", "text": "推文内容", 
                "imagePrompt": "图片描述(可选)", 
                "stats": {"views": 1000, "likes": 10, "retweets": 5, "replies": 2},
                "comments": [{"name": "评论人", "handle": "@handle", "text": "评论内容"}]
            }
        ]`;

        try {
            const res = await window.API.callAI(prompt, apiConfig);
            let tweets = [];
            try {
                tweets = JSON.parse(res);
            } catch(e) {
                const match = res.match(/\[[\s\S]*\]/);
                if(match) tweets = JSON.parse(match[0]);
            }
            
            if(Array.isArray(tweets)) {
                const newTweets = [];
                for(const t of tweets) {
                    let images = [];
                    if(t.imagePrompt && apiConfig.imageApiKey) {
                        try {
                            const imgBase64 = await window.API.generateImage(t.imagePrompt, apiConfig);
                            const imgId = await window.db.saveImage(imgBase64);
                            images.push(imgId);
                        } catch(e) { console.error('Image gen failed', e); }
                    }
                    
                    // Check if it's a known role
                    let avatar = '';
                    const bound = boundRoles.find(b => b.twitterHandle === t.handle);
                    const enabled = enabledRoles.find(b => b.twitterHandle === t.handle);
                    
                    if(bound) {
                        const f = qqData.friends.find(fr => fr.id === bound.qqId);
                        if(f) avatar = f.avatar;
                    } else if(enabled) {
                        const f = qqData.friends.find(fr => fr.id === enabled.qqId);
                        if(f) avatar = f.avatar;
                    } else {
                        // Generate avatar for stranger and save to DB
                        const avatarBase64 = window.Utils.generateDefaultAvatar(t.name);
                        avatar = await window.db.saveImage(avatarBase64);
                    }

                    const comments = (t.comments || []).map(c => ({
                        name: c.name,
                        handle: c.handle,
                        text: c.text,
                        time: Date.now() - Math.floor(Math.random() * 3600000),
                        avatar: window.Utils.generateDefaultAvatar(c.name)
                    }));

                    newTweets.push({
                        id: window.Utils.generateId('tweet'),
                        accountId: 'ai_generated',
                        isAI: true,
                        aiName: t.name,
                        aiHandle: t.handle,
                        aiAvatar: avatar,
                        text: t.text,
                        time: Date.now(),
                        likes: t.stats?.likes || Math.floor(Math.random() * 500),
                        retweets: t.stats?.retweets || Math.floor(Math.random() * 100),
                        replies: t.stats?.replies || Math.floor(Math.random() * 50),
                        views: t.stats?.views || Math.floor(Math.random() * 5000),
                        images: images,
                        quoteId: null,
                        comments: comments
                    });
                }

                this.store.update(d => d.tweets.push(...newTweets));
                this.renderHome();
            }
        } catch(e) {
            console.error(e);
            alert('生成失败');
        } finally {
            btn.innerHTML = originalIcon;
        }
    }

    async renderSearch() {
        const apiConfig = window.API.getConfig();
        const container = document.getElementById('t-search');
        container.innerHTML = `
            <div class="t-search-header">
                <input type="text" class="t-search-input" id="tSearchInput" placeholder="搜索 X">
            </div>
            <div class="t-trends-list" id="tTrendsList">
                <div style="text-align:center;padding:20px;color:#999;">正在获取热搜...</div>
            </div>
        `;
        
        const input = document.getElementById('tSearchInput');
        input.onkeydown = (e) => {
            if(e.key === 'Enter') this.performSearch(e.target.value);
        };

        if(apiConfig.chatApiKey) {
            const prompt = `生成 5-8 个推特热搜话题，包含排名、话题名称、推文数量。返回 JSON: [{"rank": 1, "topic": "话题", "posts": "1.2M"}]`;
            try {
                const res = await window.API.callAI(prompt, apiConfig);
                const trends = JSON.parse(res);
                const list = document.getElementById('tTrendsList');
                list.innerHTML = '';
                trends.forEach(t => {
                    const div = document.createElement('div');
                    div.className = 't-trend-item';
                    div.style.cssText = 'padding:15px; border-bottom:1px solid #eff3f4; cursor:pointer;';
                    div.innerHTML = `
                        <div style="font-size:12px; color:#536471;">${t.rank} · Trending</div>
                        <div style="font-weight:bold; margin:2px 0;">#${t.topic}</div>
                        <div style="font-size:12px; color:#536471;">${t.posts} posts</div>
                    `;
                    div.onclick = () => this.performSearch(t.topic);
                    list.appendChild(div);
                });
            } catch(e) {
                document.getElementById('tTrendsList').innerHTML = '<div style="text-align:center;padding:20px;color:#999;">获取热搜失败</div>';
            }
        }
    }

    async performSearch(query) {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        const list = document.getElementById('tTrendsList');
        list.innerHTML = '<div style="text-align:center;padding:20px;">搜索中...</div>';
        
        const prompt = `生成 5 条关于 "${query}" 的推特搜索结果。返回 JSON 数组 (格式同推文生成)。`;
        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const tweets = JSON.parse(res);
            list.innerHTML = '';
            
            for(const t of tweets) {
                const div = document.createElement('div');
                div.className = 'tweet-item';
                div.innerHTML = `
                    <div class="tweet-avatar" style="background-image:url('${window.Utils.generateDefaultAvatar(t.name)}')"></div>
                    <div class="tweet-content">
                        <div class="tweet-header"><span class="tweet-name">${t.name}</span><span class="tweet-handle">${t.handle}</span></div>
                        <div class="tweet-text">${t.text}</div>
                    </div>
                `;
                list.appendChild(div);
            }
        } catch(e) { list.innerHTML = '搜索失败'; }
    }

    async renderDMs() {
        const list = document.getElementById('dmList');
        list.innerHTML = '';
        const data = this.store.get();
        
        const tabs = document.createElement('div');
        tabs.style.cssText = 'display:flex; border-bottom:1px solid #eff3f4;';
        tabs.innerHTML = `
            <div class="t-dm-tab ${this.currentDmTab==='friends'?'active':''}" style="flex:1; text-align:center; padding:15px; cursor:pointer; font-weight:bold; border-bottom:${this.currentDmTab==='friends'?'3px solid #1d9bf0':'none'};" onclick="window.TwitterApp.switchDmTab('friends')">消息</div>
            <div class="t-dm-tab ${this.currentDmTab==='requests'?'active':''}" style="flex:1; text-align:center; padding:15px; cursor:pointer; font-weight:bold; border-bottom:${this.currentDmTab==='requests'?'3px solid #1d9bf0':'none'};" onclick="window.TwitterApp.switchDmTab('requests')">请求</div>
        `;
        list.appendChild(tabs);
        
        const genBtn = document.createElement('div');
        genBtn.style.cssText = 'padding:15px; text-align:center; color:#1d9bf0; cursor:pointer; font-weight:bold; border-bottom:1px solid #eff3f4;';
        genBtn.innerHTML = '<i class="fas fa-magic"></i> 生成新私信 (基于人设)';
        genBtn.onclick = () => this.generateNewDM();
        list.appendChild(genBtn);

        const dms = data.dms.filter(d => this.currentDmTab === 'friends' ? d.isFriend !== false : d.isFriend === false);

        if(dms.length === 0) {
            list.innerHTML += '<div style="padding:20px; text-align:center; color:#536471;">暂无私信</div>';
            return;
        }

        for(const dm of dms) {
            const div = document.createElement('div');
            div.className = 't-dm-item';
            
            let avatar = dm.participant.avatar;
            if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
            else avatar = window.Utils.generateDefaultAvatar(dm.participant.name);

            const lastMsg = dm.messages[dm.messages.length-1];

            div.innerHTML = `
                <div class="t-dm-avatar" style="background-image:url('${avatar}')"></div>
                <div class="t-dm-content">
                    <div class="t-dm-top">
                        <span class="t-dm-name">${dm.participant.name}</span>
                        <span class="t-dm-date">${lastMsg ? this.timeSince(lastMsg.time) : ''}</span>
                    </div>
                    <div class="t-dm-msg">${lastMsg ? lastMsg.text : '开始对话'}</div>
                </div>
            `;
            
            div.onclick = () => this.openDMWindow(dm.id);
            list.appendChild(div);
        }
    }
    
    switchDmTab(tab) {
        this.currentDmTab = tab;
        this.renderDMs();
    }

    async generateNewDM() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        const data = this.store.get();
        const acc = data.accounts.find(a => a.id === data.currentAccountId);
        
        const prompt = `你扮演一个推特用户，看到了用户 ${acc.name} (${acc.handle}) 的推文。
        用户简介: ${acc.bio}
        请生成一个私信对话的开头。
        返回 JSON: {"name": "用户名", "handle": "@handle", "message": "第一条消息"}`;
        
        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const json = JSON.parse(res);
            
            const id = window.Utils.generateId('dm');
            this.store.update(d => {
                d.dms.push({
                    id: id,
                    participant: { name: json.name, handle: json.handle, avatar: '' },
                    messages: [{sender: 'them', text: json.message, time: Date.now()}],
                    isFriend: true
                });
            });
            this.renderDMs();
            this.openDMWindow(id);
        } catch(e) { alert('生成失败'); }
    }

    async openDMWindow(dmId) {
        const data = this.store.get();
        const dm = data.dms.find(d => d.id === dmId);
        if(!dm) return;

        this.currentDmId = dmId;
        const win = document.getElementById('tDmWindow');
        document.getElementById('dmHeaderName').innerText = dm.participant.name;
        document.getElementById('dmHeaderHandle').innerText = dm.participant.handle;
        
        this.renderDMMessages();
        win.style.display = 'flex';
    }

    renderDMMessages() {
        const data = this.store.get();
        const dm = data.dms.find(d => d.id === this.currentDmId);
        const list = document.getElementById('dmMessages');
        list.innerHTML = '';
        
        dm.messages.forEach(m => {
            const div = document.createElement('div');
            div.className = `t-msg-bubble ${m.sender === 'me' ? 'sent' : 'received'}`;
            div.innerText = m.text;
            list.appendChild(div);
        });
        list.scrollTop = list.scrollHeight;
    }

    sendDM() {
        const input = document.getElementById('dmInput');
        const text = input.value.trim();
        if(!text) return;
        
        this.store.update(d => {
            const dm = d.dms.find(x => x.id === this.currentDmId);
            dm.messages.push({ sender: 'me', text, time: Date.now() });
        });
        input.value = '';
        this.renderDMMessages();
    }

    async generateDMReply() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const data = this.store.get();
        const dm = data.dms.find(d => d.id === this.currentDmId);
        
        const prompt = `你扮演 ${dm.participant.name} (${dm.participant.handle})。\n请回复用户的私信。\n用户上一句: "${dm.messages[dm.messages.length-1]?.text || ''}"\n要求：口语化、真实、符合人设。`;
        
        try {
            const reply = await window.API.callAI(prompt, apiConfig);
            this.store.update(d => {
                const target = d.dms.find(x => x.id === this.currentDmId);
                target.messages.push({ sender: 'them', text: reply, time: Date.now() });
            });
            this.renderDMMessages();
        } catch(e) { console.error(e); }
    }

    timeSince(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m";
        return Math.floor(seconds) + "s";
    }
    
    openPostModal() {
        if(confirm('发布推文 (确定) 还是 开启直播 (取消)?')) {
            document.getElementById('tPostModal').style.display = 'flex';
            document.getElementById('doTPost').onclick = () => this.createPost();
        } else {
            this.startLive();
        }
    }

    async createPost() {
        const text = document.getElementById('tPostInput').value;
        if(!text) return;
        
        const data = this.store.get();
        const newTweet = {
            id: window.Utils.generateId('tweet'),
            accountId: data.currentAccountId,
            text: text,
            time: Date.now(),
            likes: 0, retweets: 0, replies: 0, views: 0,
            images: [], quoteId: null, comments: []
        };
        
        this.store.update(d => d.tweets.unshift(newTweet));
        document.getElementById('tPostModal').style.display = 'none';
        document.getElementById('tPostInput').value = '';
        this.renderHome();
        
        // Trigger AI Interactions
        this.generateInteractions(newTweet.id, text);
    }

    async generateInteractions(tweetId, text) {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return;
        
        const prompt = `用户发布了推文: "${text}"。
        请生成 3-5 条来自不同用户的评论，以及该推文的浏览量、点赞数。
        返回 JSON: {
            "views": 1234, "likes": 56, "retweets": 12,
            "comments": [{"name": "User", "handle": "@user", "text": "Comment"}]
        }`;
        
        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const json = JSON.parse(res);
            
            this.store.update(d => {
                const t = d.tweets.find(x => x.id === tweetId);
                if(t) {
                    t.views = json.views;
                    t.likes = json.likes;
                    t.retweets = json.retweets;
                    t.replies = json.comments.length;
                    t.comments = json.comments.map(c => ({...c, time: Date.now()}));
                }
            });
            this.renderHome();
            
            if(Notification.permission === 'granted') {
                new Notification('X', { body: `你的推文收到了 ${json.comments.length} 条回复` });
            }
        } catch(e) { console.error(e); }
    }
    
    startLive() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.style.background = '#000';
        modal.innerHTML = `
            <div style="width:100%;height:100%;display:flex;flex-direction:column;color:white;">
                <div style="padding:20px;display:flex;justify-content:space-between;">
                    <span style="background:red;padding:2px 5px;border-radius:3px;">LIVE</span>
                    <i class="fas fa-times" style="cursor:pointer;" onclick="this.closest('.modal').remove()"></i>
                </div>
                <div style="flex:1;display:flex;justify-content:center;align-items:center;flex-direction:column;">
                    <div style="width:100px;height:100px;background:#333;border-radius:50%;margin-bottom:20px;display:flex;justify-content:center;align-items:center;">
                        <i class="fas fa-microphone" style="font-size:40px;"></i>
                    </div>
                    <h3>正在直播中...</h3>
                    <p style="color:#999;">0 观众</p>
                </div>
                <div style="padding:20px;">
                    <input placeholder="说点什么..." style="width:100%;padding:10px;border-radius:20px;border:none;background:#333;color:white;">
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    openSettings() {
        if(!document.getElementById('tSettingsPage')) {
            const page = document.createElement('div');
            page.id = 'tSettingsPage';
            page.className = 'sub-page';
            page.style.display = 'none';
            page.innerHTML = `
                <div class="sub-header">
                    <button class="back-btn" onclick="document.getElementById('tSettingsPage').style.display='none'"><i class="fas fa-arrow-left"></i></button>
                    <span class="sub-title">Settings</span>
                </div>
                <div class="sub-content form-content">
                    <div class="form-group">
                        <label>世界观设定</label>
                        <textarea id="tWorldSetting" placeholder="例如：现代社会，每个人都有超能力..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>帖子记忆 (条数)</label>
                        <input type="number" id="tPostMemory" value="0">
                        <span style="font-size:12px;color:#999;">>0 时，粉丝评论会记得之前的帖子内容</span>
                    </div>
                    <div class="sub-section">
                        <label>NPC 管理</label>
                        <div id="tNpcList"></div>
                        <button class="action-btn secondary" id="tAddNpcBtn">创建 NPC</button>
                    </div>
                    <div class="sub-section">
                        <label>绑定角色 (记忆互通)</label>
                        <div style="font-size:12px;color:#666;margin-bottom:5px;">角色知道你是谁，记得QQ聊天内容</div>
                        <div id="tBindList"></div>
                        <button class="action-btn secondary" id="tAddBindBtn">绑定角色</button>
                    </div>
                    <div class="sub-section">
                        <label>开启角色 (记忆隔离)</label>
                        <div style="font-size:12px;color:#666;margin-bottom:5px;">角色不认识你，只把你当路人/粉丝</div>
                        <div id="tEnableList"></div>
                        <button class="action-btn secondary" id="tAddEnableBtn">开启角色</button>
                    </div>
                    <button class="action-btn" id="tSaveSettings">保存</button>
                </div>
            `;
            document.getElementById('twitterApp').appendChild(page);
            
            document.getElementById('tAddNpcBtn').onclick = () => this.createNPC();
            document.getElementById('tAddBindBtn').onclick = () => this.bindRole('bound');
            document.getElementById('tAddEnableBtn').onclick = () => this.bindRole('enabled');
            document.getElementById('tSaveSettings').onclick = () => {
                this.store.update(d => {
                    d.settings.worldSetting = document.getElementById('tWorldSetting').value;
                    d.settings.postMemory = parseInt(document.getElementById('tPostMemory').value);
                });
                alert('设置已保存');
                document.getElementById('tSettingsPage').style.display = 'none';
            };
        }
        
        const settings = this.store.get().settings;
        document.getElementById('tWorldSetting').value = settings.worldSetting || '现代社会';
        document.getElementById('tPostMemory').value = settings.postMemory || 0;
        this.renderNpcList();
        this.renderBindList();
        
        document.getElementById('tSettingsPage').style.display = 'flex';
    }

    renderAccountList() {
        const list = document.getElementById('tAccountList');
        list.innerHTML = '';
        const data = this.store.get();
        
        data.accounts.forEach(acc => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:10px; display:flex; align-items:center; cursor:pointer; hover:bg-gray-100;';
            if(acc.id === data.currentAccountId) div.style.background = '#f7f9f9';
            
            window.db.getImage(acc.avatar).then(url => {
                div.innerHTML = `
                    <div style="width:30px; height:30px; border-radius:50%; background:url('${url || 'https://picsum.photos/30/30'}') center/cover; margin-right:10px;"></div>
                    <div style="flex:1;">
                        <div style="font-weight:bold; font-size:14px;">${acc.name}</div>
                        <div style="color:#536471; font-size:12px;">${acc.handle}</div>
                    </div>
                    ${acc.id === data.currentAccountId ? '<i class="fas fa-check" style="color:#1d9bf0;"></i>' : ''}
                `;
            });
            
            div.onclick = () => {
                this.store.update(d => d.currentAccountId = acc.id);
                this.updateHeaderAvatar();
                this.renderHome();
                this.closeDrawer();
                document.getElementById('tAccountSwitcher').style.display = 'none';
            };
            list.appendChild(div);
        });
    }

    addAccount() {
        const name = prompt('Account Name:');
        const handle = prompt('Handle (@...):');
        if(name && handle) {
            const id = window.Utils.generateId('acc');
            this.store.update(d => {
                d.accounts.push({
                    id, name, handle, avatar: '', bio: '', following: 0, followers: 0, verified: false
                });
                d.currentAccountId = id;
            });
            this.updateHeaderAvatar();
            this.renderHome();
            this.closeDrawer();
        }
    }

    renderNpcList() {
        const list = document.getElementById('tNpcList');
        list.innerHTML = '';
        const npcs = this.store.get().settings.npcs || [];
        npcs.forEach(npc => {
            const div = document.createElement('div');
            div.innerHTML = `${npc.name} (${npc.handle}) <button onclick="window.TwitterApp.deleteNpc('${npc.id}')">x</button>`;
            list.appendChild(div);
        });
    }

    deleteNpc(id) {
        this.store.update(d => d.settings.npcs = d.settings.npcs.filter(n => n.id !== id));
        this.renderNpcList();
    }

    renderBindList() {
        const bindList = document.getElementById('tBindList');
        const enableList = document.getElementById('tEnableList');
        bindList.innerHTML = '';
        enableList.innerHTML = '';
        
        const settings = this.store.get().settings;
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
        
        (settings.boundRoles || []).forEach(b => {
            const friend = qqData.friends.find(f => f.id === b.qqId);
            const name = friend ? friend.name : 'Unknown';
            const div = document.createElement('div');
            div.innerHTML = `${name} <-> ${b.twitterHandle} <button onclick="window.TwitterApp.deleteRole('bound', '${b.qqId}')">x</button>`;
            bindList.appendChild(div);
        });

        (settings.enabledRoles || []).forEach(b => {
            const friend = qqData.friends.find(f => f.id === b.qqId);
            const name = friend ? friend.name : 'Unknown';
            const div = document.createElement('div');
            div.innerHTML = `${name} <-> ${b.twitterHandle} <button onclick="window.TwitterApp.deleteRole('enabled', '${b.qqId}')">x</button>`;
            enableList.appendChild(div);
        });
    }

    bindRole(type) {
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
        if(qqData.friends.length === 0) return alert('No QQ friends to bind');
        
        const names = qqData.friends.map((f, i) => `${i+1}. ${f.name}`).join('\n');
        const choice = prompt(`Select QQ Friend:\n${names}`);
        const idx = parseInt(choice) - 1;
        
        if(idx >= 0 && idx < qqData.friends.length) {
            const friend = qqData.friends[idx];
            const handle = prompt('Enter Twitter Handle (e.g. @ai_waifu):');
            if(handle) {
                this.store.update(d => {
                    if(type === 'bound') {
                        if(!d.settings.boundRoles) d.settings.boundRoles = [];
                        d.settings.boundRoles.push({qqId: friend.id, twitterHandle: handle});
                    } else {
                        if(!d.settings.enabledRoles) d.settings.enabledRoles = [];
                        d.settings.enabledRoles.push({qqId: friend.id, twitterHandle: handle});
                    }
                });
                this.renderBindList();
            }
        }
    }

    deleteRole(type, qqId) {
        this.store.update(d => {
            if(type === 'bound') d.settings.boundRoles = d.settings.boundRoles.filter(b => b.qqId !== qqId);
            else d.settings.enabledRoles = d.settings.enabledRoles.filter(b => b.qqId !== qqId);
        });
        this.renderBindList();
    }

    async renderProfile(target) {
        const detail = document.getElementById('tTweetDetail');
        const content = document.getElementById('tDetailContent');
        content.innerHTML = '';
        
        let profileData = {};
        if(target === 'me') {
            const data = this.store.get();
            profileData = data.accounts.find(a => a.id === data.currentAccountId);
        } else {
            profileData = target;
        }
        
        let avatar = profileData.avatar;
        if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
        else if(!avatar) avatar = window.Utils.generateDefaultAvatar(profileData.name);

        const header = document.createElement('div');
        header.innerHTML = `
            <div style="height:150px; background:#333;"></div>
            <div style="padding:15px; position:relative;">
                <div style="width:80px; height:80px; border-radius:50%; background:url('${avatar}') center/cover; border:4px solid #fff; position:absolute; top:-40px;"></div>
                <div style="margin-top:45px; font-weight:bold; font-size:20px;">${profileData.name}</div>
                <div style="color:#536471;">${profileData.handle}</div>
                <div style="margin-top:10px;">${profileData.bio || ''}</div>
                <div style="margin-top:10px; display:flex; gap:15px; color:#536471; font-size:14px;">
                    <span><b>${profileData.following || 0}</b> Following</span>
                    <span><b>${profileData.followers || 0}</b> Followers</span>
                </div>
            </div>
            <div style="border-bottom:1px solid #eff3f4; display:flex; font-weight:bold;">
                <div class="t-profile-tab active" data-tab="tweets" style="flex:1; text-align:center; padding:15px; border-bottom:3px solid #1d9bf0; cursor:pointer;">Tweets</div>
                <div class="t-profile-tab" data-tab="replies" style="flex:1; text-align:center; padding:15px; color:#536471; cursor:pointer;">Replies</div>
                <div class="t-profile-tab" data-tab="media" style="flex:1; text-align:center; padding:15px; color:#536471; cursor:pointer;">Media</div>
                <div class="t-profile-tab" data-tab="likes" style="flex:1; text-align:center; padding:15px; color:#536471; cursor:pointer;">Likes</div>
            </div>
            <div id="tProfileContent"></div>
        `;
        content.appendChild(header);
        
        const renderTab = async (tab) => {
            const container = document.getElementById('tProfileContent');
            container.innerHTML = '';
            const data = this.store.get();
            let tweets = [];

            if(tab === 'tweets') {
                tweets = data.tweets.filter(t => (target === 'me' && t.accountId === data.currentAccountId) || (t.isAI && t.aiHandle === profileData.handle));
            } else if(tab === 'replies') {
                // Simplified: show tweets with replies > 0
                tweets = data.tweets.filter(t => ((target === 'me' && t.accountId === data.currentAccountId) || (t.isAI && t.aiHandle === profileData.handle)) && t.replies > 0);
            } else if(tab === 'media') {
                tweets = data.tweets.filter(t => ((target === 'me' && t.accountId === data.currentAccountId) || (t.isAI && t.aiHandle === profileData.handle)) && t.images && t.images.length > 0);
            } else if(tab === 'likes') {
                // Simplified: show random liked tweets
                tweets = data.tweets.filter(t => t.likes > 50).slice(0, 5);
            }
            
            tweets.sort((a, b) => b.time - a.time);
            
            if(tweets.length === 0) {
                container.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Nothing to see here</div>';
            } else {
                for(const t of tweets) {
                    const div = await this.createTweetElement(t);
                    container.appendChild(div);
                }
            }
        };

        header.querySelectorAll('.t-profile-tab').forEach(tab => {
            tab.onclick = () => {
                header.querySelectorAll('.t-profile-tab').forEach(t => {
                    t.classList.remove('active');
                    t.style.borderBottom = 'none';
                    t.style.color = '#536471';
                });
                tab.classList.add('active');
                tab.style.borderBottom = '3px solid #1d9bf0';
                tab.style.color = '#000';
                renderTab(tab.dataset.tab);
            };
        });

        renderTab('tweets');
        
        detail.style.display = 'flex';
    }

    async generateActivity() {
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const char = window.System.currentCheckedFriend;
        if(!char) return;

        const btn = document.getElementById('tGenActivityBtn');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n请生成一条你在 Twitter (X) 上的推文。\n要求：极度拟人化，符合人设，可以是日常吐槽、分享生活或回复他人。\n返回 JSON: {"text": "推文内容", "imagePrompt": "图片描述(可选)"}`;

        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const tweet = JSON.parse(res);
            
            let images = [];
            if(tweet.imagePrompt && apiConfig.imageApiKey) {
                try {
                    const imgBase64 = await window.API.generateImage(tweet.imagePrompt, apiConfig);
                    const imgId = await window.db.saveImage(imgBase64);
                    images.push(imgId);
                } catch(e) { console.error('Image gen failed', e); }
            }

            this.store.update(d => {
                d.tweets.push({
                    id: window.Utils.generateId('tweet'),
                    accountId: d.currentAccountId, 
                    text: tweet.text,
                    time: Date.now(),
                    likes: 0,
                    retweets: 0,
                    replies: 0,
                    images: images,
                    quoteId: null,
                    comments: []
                });
            });
            
            this.renderHome();
            alert('已发布新推文');
            
            if(Math.random() > 0.5) {
                if(Notification.permission === 'granted') {
                    new Notification(char.name, { body: '发布了一条新推文' });
                }
            }

        } catch(e) {
            console.error(e);
            alert('生成失败');
        } finally {
            btn.innerHTML = '<i class="fas fa-magic"></i>';
        }
    }
}

window.TwitterApp = new TwitterApp();
