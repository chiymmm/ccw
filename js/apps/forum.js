// ============================================
// BehaviorTracker - 行为追踪系统
// 请将此代码添加到 ForumStore 类之前
// ============================================

class BehaviorTracker {
    constructor() {
        this.storageKey = 'forum_behavior_data';
        this.init();

    }

    init() {
        if (!localStorage.getItem(this.storageKey)) {
            const initialData = {
                arguments: [],      // 吵架记录 {id, oderId, targetName, targetPersona, postId, severity, time, revenged}
                bargains: [],       // 砍价记录 {id, oderId, sellerName, sellerPersona, itemId, itemTitle, originalPrice, offeredPrice, ratio, time, exposed}
                exposures: [],      // 被挂记录 {id, oderId, posterName, postId, reason, time, friendNotified}
                npcPersonas: {}     // NPC人设缓存 {name: {temperament, priceSensitivity, grudgeLevel, tolerance}}
            };
            localStorage.setItem(this.storageKey, JSON.stringify(initialData));
        }
    }

    get() {
        return JSON.parse(localStorage.getItem(this.storageKey));
    }

    set(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    update(fn) {
        const data = this.get();
        fn(data);
        this.set(data);
    }

    // ============================================
    // 自动生成NPC人设（不调用API）
    // ============================================
    generatePersona(name) {
        const data = this.get();

        // 如果已有缓存直接返回
        if (data.npcPersonas[name]) {
            return data.npcPersonas[name];
        }

        // 基于名字哈希生成伪随机但稳定的人设
        const hash = this._hashName(name);

        // 性格类型
        const temperaments = ['暴躁', '温和', '阴阳怪气', '小心眼', '大度', '记仇', '玻璃心', '佛系'];
        const temperament = temperaments[hash % temperaments.length];

        // 价格敏感度 (0-100) 越高越在意砍价
        const priceSensitivity = (hash * 7) % 100;

        // 记仇程度 (0-100) 越高越容易报复
        const grudgeLevel = (hash * 13) % 100;

        // 容忍度 (0-100) 越低越容易被激怒
        const tolerance = (hash * 17) % 100;

        // 砍价底线比例 (0.3-0.8) 砍到这个比例以下会生气
        const bargainFloor = 0.3 + ((hash * 11) % 50) / 100;

        // 报复方式偏好
        const revengeStyles = ['私信骂人', '发帖挂人', '阴阳怪气', '冷处理', '疯狂轰炸'];
        const revengeStyle = revengeStyles[(hash * 19) % revengeStyles.length];

        const persona = {
            temperament,
            priceSensitivity,
            grudgeLevel,
            tolerance,
            bargainFloor,
            revengeStyle,
            generatedAt: Date.now()
        };

        // 缓存人设
        this.update(d => {
            d.npcPersonas[name] = persona;
        });

        return persona;
    }

    _hashName(name) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            const char = name.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    // ============================================
    // 记录吵架行为
    // ============================================
    recordArgument(targetName, postId, userComment, severity = 'mild') {
        const persona = this.generatePersona(targetName);

        this.update(d => {
            d.arguments.push({
                id: `arg_${Date.now()}`,
                oderId: Date.now(),
                targetName,
                targetPersona: persona,
                postId,
                userComment,
                severity, // mild / moderate / severe
                time: Date.now(),
                revenged: false
            });
        });

        // 判断是否触发报复
        return this._shouldTriggerRevenge(persona, severity);
    }

    // ============================================
    // 记录砍价行为
    // ============================================
    recordBargain(sellerName, itemId, itemTitle, originalPrice, offeredPrice) {
        const persona = this.generatePersona(sellerName);
        const ratio = offeredPrice / originalPrice;

        this.update(d => {
            d.bargains.push({
                id: `bar_${Date.now()}`,
                oderId: Date.now(),
                sellerName,
                sellerPersona: persona,
                itemId,
                itemTitle,
                originalPrice,
                offeredPrice,
                ratio,
                time: Date.now(),
                exposed: false
            });
        });

        // 判断是否触发挂人
        return this._shouldTriggerExposure(persona, ratio);
    }

    // ============================================
    // 记录被挂
    // ============================================
    recordExposure(posterName, postId, reason) {
        this.update(d => {
            d.exposures.push({
                id: `exp_${Date.now()}`,
                oderId: Date.now(),
                posterName,
                postId,
                reason,
                time: Date.now(),
                friendNotified: false
            });
        });
    }

    // ============================================
    // 判断逻辑
    // ============================================
    _shouldTriggerRevenge(persona, severity) {
        const severityScore = { mild: 20, moderate: 50, severe: 80 };
        const score = severityScore[severity] || 30;

        // 容忍度低 + 记仇程度高 = 容易报复
        const threshold = persona.tolerance;
        const revengeChance = (score + persona.grudgeLevel) / 2;

        return {
            shouldRevenge: revengeChance > threshold,
            revengeStyle: persona.revengeStyle,
            intensity: Math.min(100, revengeChance - threshold + 50),
            persona
        };
    }

    _shouldTriggerExposure(persona, ratio) {
        // 砍价比例低于底线 且 价格敏感度高 = 会挂人
        const isBelowFloor = ratio < persona.bargainFloor;
        const isAngry = persona.priceSensitivity > 50;

        // 暴躁/小心眼/记仇 性格更容易挂人
        const angryTemperaments = ['暴躁', '小心眼', '记仇', '玻璃心'];
        const hasAngryTemper = angryTemperaments.includes(persona.temperament);

        return {
            shouldExpose: isBelowFloor && (isAngry || hasAngryTemper),
            reason: `砍价到${Math.round(ratio * 100)}%`,
            persona
        };
    }

    // ============================================
    // 获取待处理的报复事件
    // ============================================
    getPendingRevenges() {
        const data = this.get();
        return data.arguments.filter(a => !a.revenged && this._shouldTriggerRevenge(a.targetPersona, a.severity).shouldRevenge);
    }

    getPendingExposures() {
        const data = this.get();
        return data.bargains.filter(b => !b.exposed && this._shouldTriggerExposure(b.sellerPersona, b.ratio).shouldExpose);
    }

    getUnnotifiedExposures() {
        const data = this.get();
        return data.exposures.filter(e => !e.friendNotified);
    }

    // ============================================
    // 标记已处理
    // ============================================
    markRevenged(argumentId) {
        this.update(d => {
            const arg = d.arguments.find(a => a.id === argumentId);
            if (arg) arg.revenged = true;
        });
    }

    markExposed(bargainId) {
        this.update(d => {
            const bar = d.bargains.find(b => b.id === bargainId);
            if (bar) bar.exposed = true;
        });
    }

    markFriendNotified(exposureId) {
        this.update(d => {
            const exp = d.exposures.find(e => e.id === exposureId);
            if (exp) exp.friendNotified = true;
        });
    }

    // ============================================
    // 检查是否是好友
    // ============================================
    isFriend(name) {
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        return qqData.friends.some(f => f.name === name);
    }

    getFriend(name) {
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        return qqData.friends.find(f => f.name === name);
    }
}

// 全局实例
window.BehaviorTracker = new BehaviorTracker();
// ============================================
// ConsequenceGenerator - 后果生成器
// 在用户触发生成时注入后果内容
// ============================================

class ConsequenceGenerator {
    constructor() {
        this.tracker = window.BehaviorTracker;
    }

    // ============================================
    // 获取待注入的挂人请求（用于 generatePosts 的 prompt）
    // ============================================
    getExposurePromptInjection() {
        const pendingExposures = this.tracker.getPendingExposures();
        if (pendingExposures.length === 0) return null;

        const exposureRequests = pendingExposures.map(b => {
            const persona = b.sellerPersona;
            return {
                sellerName: b.sellerName,
                itemTitle: b.itemTitle,
                originalPrice: b.originalPrice,
                offeredPrice: b.offeredPrice,
                ratio: Math.round(b.ratio * 100),
                temperament: persona.temperament,
                revengeStyle: persona.revengeStyle,
                bargainId: b.id
            };
        });

        // 构造注入 prompt 的文本
        const injectionText = `
【重要：必须生成以下挂人帖】
有卖家因为被砍价太狠而愤怒要发帖挂买家（用户）。请在生成的帖子中包含以下挂人帖：

${exposureRequests.map((e, i) => `
${i + 1}. 卖家「${e.sellerName}」（性格：${e.temperament}）
   - 商品：${e.itemTitle}
   - 原价：¥${e.originalPrice}
   - 买家出价：¥${e.offeredPrice}（${e.ratio}%）
   - 报复风格：${e.revengeStyle}
   - 要求：以卖家口吻发帖吐槽/挂这个砍价的买家不要提买家真名可以用"某人""有个人"等称呼帖子要符合卖家性格
`).join('\n')}

挂人帖的 JSON 中请额外添加字段 "isExposure": true, "exposureBargainId": "对应的bargainId"
`;

        return {
            text: injectionText,
            bargainIds: exposureRequests.map(e => e.bargainId)
        };
    }

    // ============================================
    // 获取待注入的报复私信请求（用于 generateNewChat 的 prompt）
    // ============================================
    getRevengePromptInjection() {
        const pendingRevenges = this.tracker.getPendingRevenges();
        if (pendingRevenges.length === 0) return null;

        const revengeRequests = pendingRevenges.map(a => {
            const persona = a.targetPersona;
            return {
                targetName: a.targetName,
                userComment: a.userComment,
                severity: a.severity,
                temperament: persona.temperament,
                revengeStyle: persona.revengeStyle,
                argumentId: a.id,
                time: a.time
            };
        });

        const injectionText = `
【重要：生成报复私信】
以下用户曾在评论区和人吵架对方现在要私信来骂/质问用户：

${revengeRequests.map((r, i) => `
${i + 1}. 「${r.targetName}」（性格：${r.temperament}报复风格：${r.revengeStyle}）
   - 用户当时说的话：${r.userComment}
   - 严重程度：${r.severity}
   - 发生时间：${new Date(r.time).toLocaleString()}
   - 要求：生成该用户发来的私信内容符合其性格和报复风格可以是骂人/阴阳怪气/质问等
`).join('\n')}

返回JSON格式：{"userName": "发私信的人名", "messages": ["消息1", "消息2"]}
`;

        return {
            text: injectionText,
            argumentIds: revengeRequests.map(r => r.argumentId)
        };
    }

    // ============================================
    // 获取好友通知请求（当用户被挂且好友可能看到时）
    // ============================================
    getFriendNotificationData() {
        const unnotified = this.tracker.getUnnotifiedExposures();
        if (unnotified.length === 0) return null;

        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        const friends = qqData.friends;

        if (friends.length === 0) return null;

        // 找出可能看到帖子的好友（随机选择1-2个）
        const shuffled = [...friends].sort(() => Math.random() - 0.5);
        const witnessing = shuffled.slice(0, Math.min(2, shuffled.length));

        return {
            exposures: unnotified,
            witnesses: witnessing.map(f => ({
                id: f.id,
                name: f.name,
                persona: f.persona || '普通朋友'
            }))
        };
    }

    // ============================================
    // 标记后果已处理
    // ============================================
    markExposuresProcessed(bargainIds) {
        bargainIds.forEach(id => this.tracker.markExposed(id));
    }

    markRevengesProcessed(argumentIds) {
        argumentIds.forEach(id => this.tracker.markRevenged(id));
    }

    markFriendNotified(exposureIds) {
        exposureIds.forEach(id => this.tracker.markFriendNotified(id));
    }
        // ============================================
    // 生成 QQ 好友看到用户被挂后的消息（供QQ模块调用）
    // ============================================
    async generateFriendReactionMessage(friendName, friendPersona, exposureReason) {
        const apiConfig = window.API?.getConfig();
        if (!apiConfig?.chatApiKey) return null;

        const prompt = `你是「${friendName}」人设：${friendPersona}

你在论坛上看到有人发帖挂你的朋友（用户）。
被挂原因：${exposureReason}

请生成你在QQ上跟这个朋友说的话。可以是：
- 关心询问怎么回事
- 嘲笑朋友
- 帮朋友出主意
- 假装没看到但话里有话
- 取决于你和他的关系

返回纯文本一条消息即可。`;

        try {
            const res = await window.API.callAI([{role:'user', content:prompt}], apiConfig);
            return res.trim();
        } catch(e) {
            return null;
        }
    }

    // ============================================
    // 检查并推送好友通知到QQ（供QQ模块调用）
    // ============================================
    async pushFriendNotificationsToQQ() {
        const notificationData = this.getFriendNotificationData();
        if (!notificationData) return;

        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[],"messages":{}}');

        for (const exposure of notificationData.exposures) {
            for (const witness of notificationData.witnesses) {
                const message = await this.generateFriendReactionMessage(
                    witness.name,
                    witness.persona,
                    exposure.reason
                );

                if (message) {
                    if (!qqData.messages[witness.id]) {
                        qqData.messages[witness.id] = [];
                    }

                    qqData.messages[witness.id].push({
                        id: Date.now(),
                        senderId: witness.id,
                        senderName: witness.name,
                        content: message,
                        type: 'text',
                        timestamp: Date.now(),
                        status: 'normal'
                    });

                    console.log(`[后果生成] ${witness.name} 在QQ上提到了用户被挂的事`);
                }
            }

            // 标记已通知
            this.markFriendNotified([exposure.id]);
        }

        localStorage.setItem('qq_data', JSON.stringify(qqData));
    }

}

window.ConsequenceGenerator = new ConsequenceGenerator();

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
                settings: { worldSetting: '现代网络社区', rules: '友好交流，禁止谩骂' , autoReply: true}
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
            
this.initConsequenceHooks(); // 新增
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

// ========== 新增：注入挂人帖请求 ==========
const exposureInjection = window.ConsequenceGenerator.getExposurePromptInjection();
if (exposureInjection) {
    prompt += exposureInjection.text;
}
// ========== 注入结束 ==========

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
        const res = await window.API.callAI([{role:'user', content:prompt}], apiConfig);

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
                        image: imgId, // Store ID instead of Base64
                            
isExposure: p.isExposure || false
,
    exposureBargainId: p.exposureBargainId || null
                    });
                }
// ========== 新增：处理挂人帖并记录被挂事件 ==========
if (exposureInjection) {
    for (const p of processedPosts) {
        if (p.isExposure && p.exposureBargainId) {
            // 记录被挂事件
            window.BehaviorTracker.recordExposure(
                p.author,
                p.id,
                `砍价被挂: ${p.title}`
            );
        }
    }
    // 标记这些砍价已被处理
    window.ConsequenceGenerator.markExposuresProcessed(exposureInjection.bargainIds);
}
// ========== 处理结束 ==========



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

    // 正确的板块生成 prompt
    const prompt = `基于世界观"${settings.worldSetting}"，生成 5-8 个论坛板块分区。
    要求：
    1. 板块名称简洁符合世界观主题。
    2. 板块描述说明该板块讨论的内容。
    3. 图标使用单个 emoji 表示。
    4. 板块类型多样化（如：综合讨论、资源分享、求助问答、闲聊水区、交易市场等）。
    5. 返回 JSON 数组:
    [
        {"name": "板块名", "desc": "板块描述", "icon": "emoji图标"}
    ]`;

    try {
        const res = await window.API.callAI([{role:'user', content:prompt}], apiConfig);

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
    } catch(e) {
        console.error(e);
        alert('生成失败');
    }
    finally {
        if(btn) btn.innerHTML = '<i class="fas fa-magic"></i>';
    }
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
const res = await window.API.callAI([{role:'user', content:prompt}], apiConfig);

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

    // ========== 新增：检查是否有待报复的私信 ==========
    const revengeInjection = window.ConsequenceGenerator.getRevengePromptInjection();

    let prompt;
    if (revengeInjection) {
        // 优先生成报复私信
        prompt = `${revengeInjection.text}`;
    } else {
        // 正常生成
        prompt = `生成一个论坛私信对话的开头。
返回 JSON: {"userName": "用户名", "message": "第一条消息"}`;
    }
    // ========== 检查结束 ==========

    try {
        const res = await window.API.callAI([{role:'user', content:prompt}], apiConfig);
        const json = window.Utils.safeParseJSON(res);

        // ========== 新增：处理报复私信的多条消息 ==========
        if (revengeInjection && json.messages && Array.isArray(json.messages)) {
            this.startChatWithUser(json.userName);
            const data = this.store.get();
            const chat = data.chats.find(c => c.userName === json.userName);
            if(chat) {
                json.messages.forEach(msg => {
                    chat.messages.push({
                        sender: 'other',
                        content: msg,
                        time: Date.now()
                    });
                });
                this.store.set(data);
                this.renderChatList();

                // 标记报复已处理
                window.ConsequenceGenerator.markRevengesProcessed(revengeInjection.argumentIds);

                // 显示通知
                const hint = document.createElement('div');
                hint.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(255,77,79,0.95);color:#fff;padding:15px 25px;border-radius:10px;z-index:9999;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
                hint.innerHTML = `<i class="fas fa-angry"></i> ${json.userName} 发来了愤怒的私信...`;
                document.body.appendChild(hint);
                setTimeout(() => hint.remove(), 3000);
            }
        } else {
            // 原有逻辑
            this.startChatWithUser(json.userName);
            const data = this.store.get();
            const chat = data.chats.find(c => c.userName === json.userName);
            if(chat) {
                chat.messages.push({sender: 'other', content: json.message, time: Date.now()});
                this.store.set(data);
                this.renderChatList();

                const existingModal = document.querySelector('.sub-page');
                if(existingModal && existingModal.querySelector('.sub-title')?.innerText === json.userName) {
                    existingModal.remove();
                    this.openChat(chat);
                }
            }
        }
        // ========== 处理结束 ==========

    } catch(e) { alert('生成失败'); }
    finally { if(btn) btn.innerHTML = '<i class="fas fa-magic"></i>'; }
}


async renderMe() {
    const data = this.store.get();
    const user = data.user;
    const container = document.getElementById('forum-me');
    container.innerHTML = '';

    // 修复：正确处理头像URL
    let avatarUrl = '';
    if(user.avatar) {
        if(user.avatar.startsWith('img_')) {
            const blobUrl = await window.db.getImage(user.avatar);
            avatarUrl = blobUrl || '';
        } else if(user.avatar.startsWith('data:') || user.avatar.startsWith('http') || user.avatar.startsWith('blob:')) {
            avatarUrl = user.avatar;
        } else {
            avatarUrl = user.avatar;
        }
    }

    if(!avatarUrl) {
        avatarUrl = window.Utils.generateDefaultAvatar(user.name || '用户');
    }

    // Header
    const header = document.createElement('div');
    header.style.cssText = `background:#333;color:#fff;padding:30px 20px;text-align:center;position:relative;`;
    if(user.bgImage) header.style.backgroundImage = `url('${user.bgImage}')`;

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

    // Avatar Change - 修复：先转Base64再保存
    header.querySelector('#forumUserAvatar').onclick = () => {
        header.querySelector('#forumAvatarInput').click();
    };

    header.querySelector('#forumAvatarInput').onchange = (e) => {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const base64 = evt.target.result;
                    const id = await window.db.saveImage(base64);
                    this.store.update(d => {
                        d.user.avatar = id;
                    });
                    this.renderMe();
                    alert('头像更换成功！');
                } catch(err) {
                    console.error('Avatar save failed', err);
                    alert('头像保存失败');
                }
            };
            reader.onerror = () => {
                alert('读取图片失败');
            };
            reader.readAsDataURL(file);
        }
    };

    // Edit Profile
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

    // ========== 新增：吵架检测 ==========
    const severity = window.BehaviorTracker.detectArgumentSeverity(text);
    if (severity) {
        // 判断回复对象（如果是"回复 xxx:"格式）
        const replyMatch = text.match(/^回复\s*(.+?)[:：]/);
        let targetName = null;

        if (replyMatch) {
            targetName = replyMatch[1].trim();
        } else if (post.comments.length > 0) {
            // 否则默认和最后一个评论者吵
            const lastComment = post.comments[post.comments.length - 1];
            if (lastComment.author !== data.user.name) {
                targetName = lastComment.author;
            }
        }

        if (targetName && targetName !== data.user.name) {
            const result = window.BehaviorTracker.recordArgument(
                targetName,
                post.id,
                text,
                severity
            );

            console.log(`[行为追踪] 检测到与 ${targetName} 的争吵严重程度: ${severity}`, result);

            // 如果对方会报复添加视觉提示
            if (result.shouldRevenge) {
                setTimeout(() => {
                    const hint = document.createElement('div');
                    hint.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(255,77,79,0.9);color:#fff;padding:10px 20px;border-radius:8px;z-index:9999;font-size:14px;';
                    hint.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${targetName} 似乎很生气...`;
                    document.body.appendChild(hint);
                    setTimeout(() => hint.remove(), 2000);
                }, 500);
            }
        }
    }
    // ========== 吵架检测结束 ==========

    this.store.update(d => {
        const p = d.posts.find(x => x.id === post.id);
        if(p) p.comments.push(newComment);
        d.user.stats.replies++;
        d.user.history.replies.push(post.id);
    });
    post.comments.push(newComment);
    input.value = '';
    renderComments();

 
            
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
const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
const friendNames = qqData.friends.map(f => `${f.name}（人设：${f.persona?.substring(0,50) || '未知'}）`).join('\n');

const prompt = `[论坛互动 - 角色独立性测试]

【帖子信息】
标题：${post.title}
楼主：${post.author}
内容：${post.content.substring(0,150)}

【刚才的评论】
${data.user.name} 说："${text}"

【你认识的人】
${friendNames || '无'}

【任务】
生成1-2条其他论坛用户的回复。

【关键要求】
1. 每个回复者必须有完全不同的性格和说话方式
2. 如果${post.author}在你认识的人里回复可以更熟络；如果不认识语气更陌生
3. 回复针对的是${data.user.name}的评论不是针对帖子
4. 可以：抬杠、开玩笑、认真讨论、阴阳怪气、无关回复
5. 风格必须多样化：不要都是"哈哈"、不要都是"我觉得"、不要都是完整句

【禁止】
- 禁止两个人说相似的话
- 禁止都用礼貌/理性的语气
- 禁止都用相同长度的句子

返回JSON格式：[{"author":"回复者名字","content":"回复内容（必须口语化）"}]

示例（仅供参考风格差异）：
[
  {"author":"路人甲","content":"？？？这也行"},
  {"author":"老王","content":"笑死楼上说得对哈哈哈哈"}
]`;

                try {
const res = await window.API.callAI([{role:'user', content:prompt}], apiConfig);

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

    // ========== 新增：获取与好友的关系和历史 ==========
    const behaviorData = window.BehaviorTracker.get
();
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}'
);

    // 检查是否有和这个好友的负面历史
    const hadArguments = behaviorData.arguments.some(a => a.targetName === friend.name
);
    const bargainHistory = behaviorData.bargains.filter(b => b.sellerName === friend.name
);
    const badBargains = bargainHistory.filter(b => b.ratio < 0.5
);

    let relationshipContext = ''
;
    if
 (hadArguments) {
        relationshipContext += 
`\n注意：你和用户之前在论坛吵过架可能还在生气。`
;
    }
    if (badBargains.length > 0
) {
        relationshipContext += 
`\n注意：用户之前向你砍价砍得很狠(${badBargains.map(b => `${b.itemTitle}砍到${Math.round(b.ratio*100)}%`).join('、')})你可能对此有意见。`
;
    }
        
        const prompt = `你扮演 ${friend.name}。\n人设: ${friend.persona}\n用户请求你代付一件商品。\n商品: ${item.title}\n价格: ${item.price}\n请根据你的人设决定是否同意代付。\n如果同意，请回复 JSON: {"agreed": true, "reply": "同意的回复内容"}\n如果拒绝，请回复 JSON: {"agreed": false, "reply": "拒绝的回复内容"}`;
        
        try {
const res = await window.API.callAI([{role:'user', content:prompt}], apiConfig);

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
if(typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(friend.name, {body: result.reply});
}

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
    const data = this.store.get();

    const modal = document.createElement('div');
    modal.className = 'sub-page';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#f5f5f5;z-index:9999;display:flex;flex-direction:column;';

    modal.innerHTML = `
        <div style="display:flex;align-items:center;padding:12px 15px;background:#fff;border-bottom:1px solid #eee;flex-shrink:0;">
            <i class="fas fa-chevron-left" id="closeForumChat" style="cursor:pointer;padding:5px;font-size:16px;"></i>
            <span style="flex:1;text-align:center;font-weight:bold;">${chat.userName}</span>
            <div style="display:flex;gap:15px;align-items:center;">
                <span id="bargainBtn" style="cursor:pointer;font-size:12px;color:#666;">砍价</span>
                <i class="fas fa-cog" id="chatSettingsBtn" style="cursor:pointer;font-size:14px;color:#666;"></i>
            </div>
        </div>
        <div id="forumChatMessages" style="flex:1;overflow-y:auto;padding:15px;background:#f5f5f5;"></div>
        <div style="display:flex;align-items:center;gap:10px;padding:12px 15px;background:#fff;border-top:1px solid #eee;flex-shrink:0;">
            <input id="forumChatInput" placeholder="输入消息..." style="flex:1;border:1px solid #e0e0e0;border-radius:20px;padding:10px 16px;font-size:14px;outline:none;background:#fafafa;">
            <div id="forumChatSend" style="width:36px;height:36px;border-radius:50%;background:#fff;border:2px solid #333;display:flex;justify-content:center;align-items:center;cursor:pointer;flex-shrink:0;">
                <i class="fas fa-paper-plane" style="font-size:13px;color:#333;margin-left:2px;"></i>
            </div>
            <div id="forumChatGenerate" style="width:36px;height:36px;border-radius:50%;background:#333;display:flex;justify-content:center;align-items:center;cursor:pointer;flex-shrink:0;">
                <i class="fas fa-magic" style="font-size:13px;color:#fff;"></i>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const renderMsgs = () => {
        const container = modal.querySelector('#forumChatMessages');
        container.innerHTML = '';
        chat.messages.forEach(m => {
            const div = document.createElement('div');
            div.style.cssText = `display:flex;margin-bottom:10px;${m.sender === 'user' ? 'justify-content:flex-end;' : 'justify-content:flex-start;'}`;
            div.innerHTML = `
                <div style="max-width:75%;padding:10px 14px;border-radius:18px;font-size:14px;line-height:1.5;word-break:break-word;
                    ${m.sender === 'user'
                        ? 'background:#333;color:#fff;border-bottom-right-radius:6px;'
                        : 'background:#fff;color:#333;border-bottom-left-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.1);'}">
                    ${m.content}
                </div>
            `;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    };
    renderMsgs();

    modal.querySelector('#closeForumChat').onclick = () => modal.remove();

    modal.querySelector('#chatSettingsBtn').onclick = () => {
        const currentData = this.store.get();
        const currentAuto = currentData.settings.autoReply !== false;
        this.store.update(d => d.settings.autoReply = !currentAuto);
        alert(`自动回复已${!currentAuto ? '开启' : '关闭'}`);
    };

    const generateReply = async () => {
        const apiConfig = window.API.getConfig();
        if (!apiConfig.chatApiKey) return alert('请先配置API Key');

        const genBtn = modal.querySelector('#forumChatGenerate');
        genBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:13px;color:#fff;"></i>';
            
// ========== 新增：获取关系上下文 ==========
    const behaviorData = window.BehaviorTracker.get
();
    const isFriend = window.BehaviorTracker.isFriend(chat.userName
);
    const friendInfo = window.BehaviorTracker.getFriend(chat.userName
);

    let relationContext = ''
;
    if
 (isFriend && friendInfo) {
        relationContext = 
`\n你是用户的QQ好友人设：${friendInfo.persona || '普通朋友'}`
;

        // 检查负面历史
        const recentArguments = behaviorData.arguments.filter(a =>
            a.
targetName === chat.userName && Date.now() - a.time < 24 * 60 * 60 * 1000
        );
        const recentBadBargains = behaviorData.bargains.filter(b =>
            b.
sellerName === chat.userName && b.ratio < 0.5 && Date.now() - b.time < 24 * 60 * 60 * 1000
        );

        if (recentArguments.length > 0
) {
            relationContext += 
`\n最近和用户吵过架还在气头上。`
;
        }
        if (recentBadBargains.length > 0
) {
            relationContext += 
`\n用户刚才砍价砍得太狠了你很不爽。`
;
        }
    }
    // ========== 关系上下文结束 ==========

        const recentMsgs = chat.messages.slice(-10).map(m =>
            `${m.sender === 'user' ? '用户' : chat.userName}: ${m.content}`
        ).join('\n');

        const prompt = `你是"${chat.userName}"在私信聊天。

对话：
${recentMsgs}

生成1-3条回复像真人发消息口语化。
返回JSON数组：["消息1", "消息2"]`;

        try {
            const res = await window.API.callAI([{role:'user', content:prompt}], apiConfig);
            const replies = window.Utils.safeParseJSON(res);

            if (Array.isArray(replies)) {
                replies.forEach(content => {
                    if (content && typeof content === 'string') {
                        chat.messages.push({ sender: 'other', content: content.trim(), time: Date.now() });
                    }
                });
                this.store.set(this.store.get());
                renderMsgs();
            }
        } catch(e) {
            console.error(e);
            alert('生成失败');
        } finally {
            genBtn.innerHTML = '<i class="fas fa-magic" style="font-size:13px;color:#fff;"></i>';
        }
    };

modal.querySelector('#forumChatSend').onclick = async () => {
    const input = modal.querySelector('#forumChatInput');
    const text = input.value.trim();
    if (!text) return;

    // ========== 新增：检测普通消息中的砍价意图 ==========
    const bargainPrice = window.BehaviorTracker.parseBargainPrice(text);
    if (bargainPrice !== null) {
        const forumData = this.store.get();
        const relatedItem = forumData.marketItems.find(item =>
            item.seller === chat.userName && item.status === 'selling'
        );

        if (relatedItem) {
            const result = window.BehaviorTracker.recordBargain(
                chat.userName,
                relatedItem.id,
                relatedItem.title,
                relatedItem.price,
                bargainPrice
            );

            if (result.shouldExpose) {
                console.log(`[行为追踪] 私信砍价过狠可能被挂`);
            }
        }
    }
    // ========== 砍价检测结束 ==========



        chat.messages.push({ sender: 'user', content: text, time: Date.now() });
        this.store.set(this.store.get());
        renderMsgs();
        input.value = '';

        if (this.store.get().settings.autoReply !== false) {
            await generateReply();
        }
    };

    modal.querySelector('#forumChatGenerate').onclick = generateReply;

modal.querySelector('#bargainBtn').onclick = async () => {
    const price = prompt('输入想砍到的价格:');
    if (price) {
        const offeredPrice = parseFloat(price);

        // ========== 新增：砍价行为记录 ==========
        // 尝试找到关联的商品（从最近的交易记录推断）
        const forumData = this.store.get();
        const relatedItem = forumData.marketItems.find(item =>
            item.seller === chat.userName && item.status === 'selling'
        );
// ========== 新增：如果卖家是好友添加关系提示 ==========
const isFriend = window.BehaviorTracker.isFriend(chat.userName);
if (isFriend && result.shouldExpose) {
    setTimeout(() => {
        const hint = document.createElement('div');
        hint.style.cssText = 'position:fixed;top:30%;left:50%;transform:translateX(-50%);background:rgba(255,107,107,0.95);color:#fff;padding:15px 25px;border-radius:10px;z-index:9999;font-size:14px;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,0.3);';
        hint.innerHTML = `
            <div><i class="fas fa-user-friends"></i> 这可是你朋友...</div>
            <div style="font-size:12px;margin-top:5px;opacity:0.8;">这个价格可能会影响你们的关系</div>
        `;
        document.body.appendChild(hint);
        setTimeout(() => hint.remove(), 3000);
    }, 800);
}
// ========== 好友提示结束 ==========

        if (relatedItem && !isNaN(offeredPrice)) {
            const result = window.BehaviorTracker.recordBargain(
                chat.userName,
                relatedItem.id,
                relatedItem.title,
                relatedItem.price,
                offeredPrice
            );

            console.log(`[行为追踪] 砍价记录: ${relatedItem.title} ¥${relatedItem.price} → ¥${offeredPrice}`, result);

            // 如果砍价太狠显示提示
            if (result.shouldExpose) {
                setTimeout(() => {
                    const hint = document.createElement('div');
                    hint.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(255,152,0,0.9);color:#fff;padding:10px 20px;border-radius:8px;z-index:9999;font-size:14px;';
                    hint.innerHTML = `<i class="fas fa-exclamation-circle"></i> 这个价格可能会惹恼卖家...`;
                    document.body.appendChild(hint);
                    setTimeout(() => hint.remove(), 2000);
                }, 500);
            }
        }
        // ========== 砍价记录结束 ==========

        chat.messages.push({ sender: 'user', content: `${price}卖吗？`, time: Date.now() });
        this.store.set(this.store.get());
        renderMsgs();
        await generateReply();
    }
};


    // 输入框回车发送
    modal.querySelector('#forumChatInput').onkeydown = (e) => {
        if (e.key === 'Enter') modal.querySelector('#forumChatSend').click();
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
const res = await window.API.callAI([{role:'user', content:prompt}], apiConfig);

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

if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
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
            <div class="form-group" style="display:flex;justify-content:space-between;align-items:center;padding:15px 0;border-bottom:1px solid #eee;">
                <div>
                    <div style="font-weight:bold;">自动生成回复</div>
                    <div style="font-size:12px;color:#999;">开启后发送消息会自动生成对方回复</div>
                </div>
                <label class="switch" style="position:relative;width:50px;height:26px;">
                    <input type="checkbox" id="autoReplyToggle" ${settings.autoReply !== false ? 'checked' : ''} style="opacity:0;width:0;height:0;">
                    <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:${settings.autoReply !== false ? '#07c160' : '#ccc'};transition:.3s;border-radius:26px;"></span>
                    <span style="position:absolute;content:'';height:20px;width:20px;left:${settings.autoReply !== false ? '26px' : '3px'};bottom:3px;background-color:white;transition:.3s;border-radius:50%;"></span>
                </label>
            </div>
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
<div style="margin-top:20px;padding-top:20px;border-top:1px solid #eee;">
    <div style="color:#999;font-size:12px;margin-bottom:10px;">开发者工具</div>
    <button class="action-btn secondary" id="openDebugPanelBtn">行为追踪调试面板</button>
</div>

<div style="margin-top:30px;padding-top:20px;border-top:1px solid #eee;">
    <div style="color:#999;font-size:12px;margin-bottom:10px;">危险操作</div>
    <button class="action-btn" id="clearAllDataBtn" style="background:#ff4d4f;border-color:#ff4d4f;">清除所有数据</button>
    <div style="color:#999;font-size:11px;margin-top:8px;">将清除所有帖子、板块、私信、交易记录及浏览历史恢复到初始状态</div>
</div>

        </div>
    `;
    document.getElementById('forumApp').appendChild(modal);

    // 开关交互效果
    const toggle = modal.querySelector('#autoReplyToggle');
    const switchSpan = toggle.nextElementSibling;
    const switchDot = switchSpan.nextElementSibling;

    toggle.onchange = () => {
        if (toggle.checked) {
            switchSpan.style.backgroundColor = '#07c160';
            switchDot.style.left = '26px';
        } else {
            switchSpan.style.backgroundColor = '#ccc';
            switchDot.style.left = '3px';
        }
    };

    modal.querySelector('#saveForumSettings').onclick = () => {
        this.store.update(d => {
            d.settings.worldSetting = document.getElementById('forumWorldSetting').value;
            d.settings.rules = document.getElementById('forumRules').value;
            d.settings.autoReply = document.getElementById('autoReplyToggle').checked;
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
    // 清除所有数据按钮
modal.querySelector('#clearAllDataBtn').onclick = () => {
    this.clearAllData(modal);
};
modal.querySelector('#openDebugPanelBtn').onclick = () => this.openDebugPanel();

}
clearAllData(settingsModal = null) {
    window.Utils.showCustomDialog({
        title: '确认清除',
        content: '此操作将清除所有论坛数据包括：\n• 所有帖子和评论\n• 所有板块\n• 所有私信记录\n• 所有交易商品\n• 浏览历史和收藏\n\n此操作不可恢复确定要继续吗？',
        buttons: [
            { text: '确认清除', class: 'confirm', value: 'confirm', style: 'background:#ff4d4f;border-color:#ff4d4f;' },
            { text: '取消', class: 'cancel', value: false }
        ]
    }).then(async (res) => {
        if (res.action === 'confirm') {
            // 重置 localStorage 中的 forum_data 为初始状态
            const initialData = {
                posts: [],
                boards: [],
                marketItems: [],
                chats: [],
                user: {
                    name: '我',
                    avatar: '',
                    signature: '这个人很懒什么都没写',
                    bgImage: '',
                    stats: { posts: 0, replies: 0, likes: 0 },
                    history: { posts: [], replies: [], favorites: [], viewed: [] }
                },
                settings: {
                    worldSetting: '现代网络社区',
                    rules: '友好交流禁止谩骂',
                    autoReply: true
                }
            };
            localStorage.setItem('forum_data', JSON.stringify(initialData));

            // 清除 IndexedDB 中论坛相关的图片（可选）
            try {
                if (window.db && window.db.clearImages) {
                    await window.db.clearImages();
                }
            } catch (e) {
                console.warn('清除图片缓存失败', e);
            }

            // 关闭设置弹窗
            if (settingsModal) {
                settingsModal.remove();
            }

            // 重置当前板块ID
            this.currentBoardId = null;

            // 重新渲染当前页面
            this.render();

            alert('所有数据已清除！');
        }
    });
}
// ============================================
// 自动触发后果机制
// ============================================
initConsequenceHooks() {
    // 每次渲染首页时检查是否有待处理的后果
    const originalRenderHome = this.renderHome.bind(this);
    this.renderHome = async () => {
        await originalRenderHome();
        this.checkPendingConsequences();
    };

    // 页面切换时也检查
    const originalRender = this.render.bind(this);
    this.render = () => {
        originalRender();
        if (this.currentTab === 'chat') {
            this.checkPendingRevengeHint();
        }
    };

    // 定时检查好友通知（每5分钟）
    setInterval(() => {
        this.pushQQNotificationsIfNeeded();
    }, 5 * 60 * 1000);

    console.log('[论坛] 后果触发机制已初始化');
}

// 检查待处理后果并显示提示
checkPendingConsequences() {
    const pendingExposures = window.BehaviorTracker.getPendingExposures();
    const pendingRevenges = window.BehaviorTracker.getPendingRevenges();

    if (pendingExposures.length > 0 || pendingRevenges.length > 0) {
        // 在生成按钮旁显示红点提示
        const genBtn = document.getElementById('genHomeBtn');
        if (genBtn && !genBtn.querySelector('.consequence-dot')) {
            const dot = document.createElement('span');
            dot.className = 'consequence-dot';
            dot.style.cssText = 'position:absolute;top:-2px;right:-2px;width:8px;height:8px;background:#ff4d4f;border-radius:50%;';
            dot.title = `有 ${pendingExposures.length} 个挂人事件和 ${pendingRevenges.length} 个报复事件待生成`;
            genBtn.style.position = 'relative';
            genBtn.appendChild(dot);
        }
    }
}

// 私信页面提示有报复消息
checkPendingRevengeHint() {
    const pendingRevenges = window.BehaviorTracker.getPendingRevenges();
    if (pendingRevenges.length > 0) {
        const genBtn = document.getElementById('genChatBtn');
        if (genBtn && !genBtn.querySelector('.revenge-dot')) {
            const dot = document.createElement('span');
            dot.className = 'revenge-dot';
            dot.style.cssText = 'position:absolute;top:-2px;right:-2px;width:8px;height:8px;background:#ff4d4f;border-radius:50%;animation:pulse 1s infinite;';
            genBtn.style.position = 'relative';
            genBtn.appendChild(dot);

            // 添加脉冲动画
            if (!document.getElementById('pulse-style')) {
                const style = document.createElement('style');
                style.id = 'pulse-style';
                style.textContent = `@keyframes pulse { 0%,100%{transform:scale(1);opacity:1;} 50%{transform:scale(1.3);opacity:0.7;} }`;
                document.head.appendChild(style);
            }
        }
    }
}

// 推送QQ通知
async pushQQNotificationsIfNeeded() {
    const unnotified = window.BehaviorTracker.getUnnotifiedExposures();
    if (unnotified.length > 0) {
        await window.ConsequenceGenerator.pushFriendNotificationsToQQ();
        console.log('[论坛] 已推送好友通知到QQ');
    }
}
// ============================================
// 调试面板 - 查看行为记录
// ============================================
openDebugPanel() {
    const data = window.BehaviorTracker.get();

    const modal = document.createElement('div');
    modal.className = 'sub-page';
    modal.style.cssText = 'display:flex;z-index:200;background:#1a1a2e;';

    const formatTime = (t) => new Date(t).toLocaleString();

    const renderPersona = (p) => `
        <div style="font-size:11px;color:#888;margin-top:3px;">
            性格:${p.temperament} | 容忍:${p.tolerance} | 记仇:${p.grudgeLevel} | 砍价底线:${Math.round(p.bargainFloor*100)}%
        </div>
    `;

    modal.innerHTML = `
        <div class="sub-header" style="background:#16213e;">
            <button class="back-btn" onclick="this.closest('.sub-page').remove()"><i class="fas fa-chevron-left"></i></button>
            <span class="sub-title" style="color:#fff;">🔧 行为追踪调试</span>
            <button id="clearBehaviorData" style="background:#ff4d4f;border:none;color:#fff;padding:5px 10px;border-radius:4px;font-size:12px;">清空</button>
        </div>
        <div class="sub-content" style="padding:15px;color:#e0e0e0;font-size:13px;">


            <div style="margin-bottom:20px;">
                <h3 style="color:#ff6b6b;margin:0 0 10px;"><i class="fas fa-angry"></i> 吵架记录 (${data.arguments.length})</h3>
                <div style="max-height:200px;overflow-y:auto;background:#0f0f23;border-radius:8px;padding:10px;">
                    ${data.arguments.length === 0 ? '<div style="color:#666;">暂无记录</div>' :
                        data.arguments.map(a => `
                            <div style="padding:8px;border-bottom:1px solid #333;${a.revenged ? 'opacity:0.5;' : ''}">
                                <div style="display:flex;justify-content:space-between;">
                                    <span style="color:#ff9f43;">与 ${a.targetName} 吵架</span>
                                    <span style="font-size:11px;color:#666;">${formatTime(a.time)}</span>
                                </div>
                                <div style="color:#aaa;font-size:12px;margin-top:3px;">你说: "${a.userComment.substring(0,50)}${a.userComment.length>50?'...':''}"</div>
                                <div style="font-size:11px;margin-top:3px;">
                                    严重程度: <span style="color:${a.severity==='severe'?'#ff4757':a.severity==='moderate'?'#ffa502':'#2ed573'}">${a.severity}</span>
                                    | 已报复: ${a.revenged ? '✅' : '❌'}
                                </div>
                                ${renderPersona(a.targetPersona)}
                            </div>
                        `).join('')}
                </div>
            </div>


            <div style="margin-bottom:20px;">
                <h3 style="color:#ffa502;margin:0 0 10px;"><i class="fas fa-hand-holding-usd"></i> 砍价记录 (${data.bargains.length})</h3>
                <div style="max-height:200px;overflow-y:auto;background:#0f0f23;border-radius:8px;padding:10px;">
                    ${data.bargains.length === 0 ? '<div style="color:#666;">暂无记录</div>' :
                        data.bargains.map(b => `
                            <div style="padding:8px;border-bottom:1px solid #333;${b.exposed ? 'opacity:0.5;' : ''}">
                                <div style="display:flex;justify-content:space-between;">
                                    <span style="color:#feca57;">${b.itemTitle}</span>
                                    <span style="font-size:11px;color:#666;">${formatTime(b.time)}</span>
                                </div>
                                <div style="font-size:12px;margin-top:3px;">
                                    原价 ¥${b.originalPrice} → 出价 ¥${b.offeredPrice}
                                    <span style="color:${b.ratio < 0.5 ? '#ff4757' : b.ratio < 0.7 ? '#ffa502' : '#2ed573'}">
                                        (${Math.round(b.ratio * 100)}%)
                                    </span>
                                </div>
                                <div style="font-size:11px;margin-top:3px;">
                                    卖家: ${b.sellerName} | 已被挂: ${b.exposed ? '✅' : '❌'}
                                </div>
                                ${renderPersona(b.sellerPersona)}
                            </div>
                        `).join('')}
                </div>
            </div>


            <div style="margin-bottom:20px;">
                <h3 style="color:#ee5a24;margin:0 0 10px;"><i class="fas fa-bullhorn"></i> 被挂记录 (${data.exposures.length})</h3>
                <div style="max-height:150px;overflow-y:auto;background:#0f0f23;border-radius:8px;padding:10px;">
                    ${data.exposures.length === 0 ? '<div style="color:#666;">暂无记录</div>' :
                        data.exposures.map(e => `
                            <div style="padding:8px;border-bottom:1px solid #333;">
                                <div style="display:flex;justify-content:space-between;">
                                    <span style="color:#ff6b6b;">${e.posterName} 发帖挂你</span>
                                    <span style="font-size:11px;color:#666;">${formatTime(e.time)}</span>
                                </div>
                                <div style="font-size:12px;color:#aaa;">原因: ${e.reason}</div>
                                <div style="font-size:11px;">好友已知晓: ${e.friendNotified ? '✅' : '❌'}</div>
                            </div>
                        `).join('')}
                </div>
            </div>


            <div>
                <h3 style="color:#a29bfe;margin:0 0 10px;"><i class="fas fa-users"></i> NPC人设缓存 (${Object.keys(data.npcPersonas).length})</h3>
                <div style="max-height:150px;overflow-y:auto;background:#0f0f23;border-radius:8px;padding:10px;">
                    ${Object.keys(data.npcPersonas).length === 0 ? '<div style="color:#666;">暂无缓存</div>' :
                        Object.entries(data.npcPersonas).map(([name, p]) => `
                            <div style="padding:5px 0;border-bottom:1px solid #333;">
                                <span style="color:#74b9ff;">${name}</span>
                                ${renderPersona(p)}
                            </div>
                        `).join('')}
                </div>
            </div>


            <div style="margin-top:20px;padding-top:15px;border-top:1px solid #333;">
                <h3 style="color:#00cec9;margin:0 0 10px;"><i class="fas fa-play"></i> 手动触发</h3>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button id="triggerExposureBtn" class="action-btn secondary" style="flex:1;min-width:120px;">生成挂人帖</button>
                    <button id="triggerRevengeBtn" class="action-btn secondary" style="flex:1;min-width:120px;">生成报复私信</button>
                    <button id="triggerQQNotifyBtn" class="action-btn secondary" style="flex:1;min-width:120px;">推送QQ通知</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('forumApp').appendChild(modal);

    // 清空按钮
    modal.querySelector('#clearBehaviorData').onclick = () => {
        if (confirm('确定清空所有行为追踪数据？')) {
            localStorage.removeItem('forum_behavior_data');
            window.BehaviorTracker.init();
            modal.remove();
            this.openDebugPanel();
        }
    };

    // 手动触发按钮
    modal.querySelector('#triggerExposureBtn').onclick = async () => {
        const pending = window.BehaviorTracker.getPendingExposures();
        if (pending.length === 0) return alert('没有待处理的挂人事件');
        alert(`有 ${pending.length} 个待处理请回到首页点击生成按钮`);
        modal.remove();
    };

    modal.querySelector('#triggerRevengeBtn').onclick = async () => {
        const pending = window.BehaviorTracker.getPendingRevenges();
        if (pending.length === 0) return alert('没有待处理的报复事件');
        alert(`有 ${pending.length} 个待处理请到私信页点击生成按钮`);
        modal.remove();
    };

    modal.querySelector('#triggerQQNotifyBtn').onclick = async () => {
        await this.pushQQNotificationsIfNeeded();
        alert('已尝试推送QQ通知');
    };
}

}

window.ForumApp = new ForumApp();
