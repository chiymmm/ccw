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
                npcPersonas: {},     // NPC人设缓存 {name: {temperament, priceSensitivity, grudgeLevel, tolerance}}
            
// ========== 新增：互动记录 ==========
            interactions: {}  // {npcName: [{type, sentiment, summary, time, weight}]}
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
// ========== 在这行下面插入以下代码 ==========

// 记忆力强度 (1-4) 数字越小记性越好，1-2次就记住；数字越大记性越差需要3-4次
const memoryStrength = 1 + (hash * 23) % 4
;

// 记忆偏向：负面事件记忆加成
const negativeMemoryBonus = ['记仇', '小心眼', '玻璃心'].includes(temperament) ? 2 : 0
;
        const persona = {
            temperament,
            priceSensitivity,
            grudgeLevel,
            tolerance,
            bargainFloor,
            revengeStyle,
                memoryStrength,        
// 新增：记忆力（1=记性好，4=记性差）
    negativeMemoryBonus,   
// 新增：负面记忆加成
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
// 检测评论中的吵架严重程度
// ============================================
detectArgumentSeverity(text) {
    if (!text || typeof text !== 'string') return null;

    const lowerText = text.toLowerCase();

    // 严重程度关键词
    const severeKeywords = [
        '滚', '死', '傻逼', 'sb', '智障', '脑残', '废物', '垃圾', '贱',
        '妈', '爹', '全家', '祖宗', '下地狱', '去死', 'nmsl', 'cnm',
        '狗东西', '畜生', '杂种', '白痴', '弱智'
    ];

    const moderateKeywords = [
        '闭嘴', '你懂个屁', '脑子有病', '有毛病', '神经病', '搞笑',
        '可笑', '笑死', '离谱', '无语', '服了', '呵呵', '？？？',
        '就这', '什么玩意', '啥玩意', '懂不懂', '会不会', '能不能',
        '有没有搞错', '搁这', '杠精', '喷子', '键盘侠'
    ];

    const mildKeywords = [
        '不同意', '不认同', '反对', '错了', '不对', '胡说', '瞎说',
        '别装', '少来', '得了吧', '算了吧', '拉倒吧', '行了行了',
        '你行你上', '说啥呢', '啥意思'
    ];

    // 检测严重程度
    for (const keyword of severeKeywords) {
        if (lowerText.includes(keyword)) {
            return 'severe';
        }
    }

    for (const keyword of moderateKeywords) {
        if (lowerText.includes(keyword)) {
            return 'moderate';
        }
    }

    for (const keyword of mildKeywords) {
        if (lowerText.includes(keyword)) {
            return 'mild';
        }
    }

    // 检测语气（多个问号/感叹号表示激动）
    const exclamationCount = (text.match(/[！!]/g) || []).length;
    const questionCount = (text.match(/[？?]{2,}/g) || []).length;

    if (exclamationCount >= 3 || questionCount >= 1) {
        return 'mild';
    }

    return null; // 没有检测到吵架迹象
}

// ============================================
// 从消息中解析砍价金额
// ============================================
parseBargainPrice(text) {
    if (!text || typeof text !== 'string') return null;

    // 匹配各种砍价表达方式
    const patterns = [
        /(\d+(?:\.\d+)?)\s*[块元]?\s*(?:卖吗|行吗|可以吗|怎么样|咋样|成吗|ok吗)/i,
        /(?:出|给|砍到|降到|便宜到)\s*(\d+(?:\.\d+)?)/i,
        /(\d+(?:\.\d+)?)\s*(?:收|拿下|要了|带走)/i,
        /(?:最多|就)\s*(\d+(?:\.\d+)?)/i,
        /¥\s*(\d+(?:\.\d+)?)/,
        /(\d+(?:\.\d+)?)\s*包邮/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const price = parseFloat(match[1]);
            if (!isNaN(price) && price > 0) {
                return price;
            }
        }
    }

    return null; // 没有检测到砍价金额
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
// 记录与NPC的互动
// type: 'comment'|'reply'|'chat'|'bargain'|'argument'
// sentiment: 'positive'|'neutral'|'negative'
// ============================================
recordInteraction(npcName, type, sentiment, summary) {
    const persona = this.generatePersona(npcName);

    // 计算权重：负面互动权重更高
    let weight = 1;
    if (sentiment === 'negative') {
        weight = 2 + (persona.negativeMemoryBonus || 0);
    } else if (sentiment === 'positive') {
        weight = 1.5;
    }

    this.update(d => {
        if (!d.interactions) d.interactions = {};
        if (!d.interactions[npcName]) d.interactions[npcName] = [];

        d.interactions[npcName].push({
            type,
            sentiment,
            summary: summary.substring(0, 100),
            time: Date.now(),
            weight
        });

        // 最多保留50条记录
        if (d.interactions[npcName].length > 50) {
            d.interactions[npcName] = d.interactions[npcName].slice(-50);
        }
    });
}

// ============================================
// 计算与某NPC的熟悉度
// 返回: {level: 0-3, score: number, canRecognize: boolean}
// level 0: 陌生人, 1: 有印象, 2: 认识, 3: 熟悉
// ============================================
getFamiliarityLevel(npcName) {
    const data = this.get();
    const interactions = data.interactions?.[npcName] || [];
    const persona = this.generatePersona(npcName);

    if (interactions.length === 0) {
        return { level: 0, score: 0, canRecognize: false };
    }

    const now = Date.now();
    const DECAY_DAYS = 30; // 30天记忆衰减

    // 计算加权分数（考虑时间衰减）
    let totalScore = 0;
    interactions.forEach(i => {
        const daysPassed = (now - i.time) / (24 * 60 * 60 * 1000);
        const decayFactor = Math.max(0.1, 1 - (daysPassed / DECAY_DAYS));
        totalScore += i.weight * decayFactor;
    });

    // 根据NPC记忆力决定阈值
    // memoryStrength: 1=记性好(阈值低), 4=记性差(阈值高)
    const baseThreshold = persona.memoryStrength || 2;

    const thresholds = {
        recognize: baseThreshold,      // 能认出的阈值
        familiar: baseThreshold * 2,   // 熟悉的阈值
        veryFamiliar: baseThreshold * 4 // 很熟的阈值
    };

    let level = 0;
    if (totalScore >= thresholds.veryFamiliar) level = 3;
    else if (totalScore >= thresholds.familiar) level = 2;
    else if (totalScore >= thresholds.recognize) level = 1;

    return {
        level,
        score: Math.round(totalScore * 10) / 10,
        canRecognize: level >= 1,
        threshold: thresholds.recognize
    };
}

// ============================================
// 获取与某NPC的关系摘要（用于AI prompt）
// ============================================
getRelationshipSummary(npcName) {
    const data = this.get();
    const interactions = data.interactions?.[npcName] || [];
    const persona = this.generatePersona(npcName);
    const familiarity = this.getFamiliarityLevel(npcName);

    if (!familiarity.canRecognize) {
        return null; // 不认识无需生成摘要
    }

    // 统计互动类型
    const stats = {
        positive: 0,
        negative: 0,
        neutral: 0,
        totalCount: interactions.length
    };

    const recentEvents = [];
    const now = Date.now();

    interactions.forEach(i => {
        stats[i.sentiment]++;
        // 收集最近7天的事件
        if (now - i.time < 7 * 24 * 60 * 60 * 1000) {
            recentEvents.push(i);
        }
    });

    // 判断总体印象
    let overallImpression = '中性';
    if (stats.negative > stats.positive * 1.5) {
        overallImpression = '负面';
    } else if (stats.positive > stats.negative * 1.5) {
        overallImpression = '正面';
    }

    // 生成摘要文本
    const levelText = ['陌生', '有点印象', '认识', '很熟'][familiarity.level];

    return {
        npcName,
        persona,
        familiarity: familiarity.level,
        familiarityText: levelText,
        overallImpression,
        interactionCount: stats.totalCount,
        positiveCount: stats.positive,
        negativeCount: stats.negative,
        recentEvents: recentEvents.slice(-5).map(e => ({
            type: e.type,
            sentiment: e.sentiment,
            summary: e.summary
        }))
    };
}

// ============================================
// 获取所有认识用户的NPC列表
// ============================================
getAllRecognizingNPCs() {
    const data = this.get();
    const result = [];

    if (!data.interactions) return result;

    Object.keys(data.interactions).forEach(npcName => {
        const familiarity = this.getFamiliarityLevel(npcName);
        if (familiarity.canRecognize) {
            result.push({
                name: npcName,
                ...this.getRelationshipSummary(npcName)
            });
        }
    });

    return result;
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
                userProfiles: {},  // {userName: {avatar, signature, followers, following, posts:[], replies:[], generatedAt}}
userFollowing: [],  // 当前用户关注的人列
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
        // ========== 新增：右上角发帖铅笔按钮 ==========
const header = document.querySelector('.forum-header'
);
if (header && !document.getElementById('forumCreatePostBtn'
)) {
    const createBtn = document.createElement('div'
);
    createBtn.
id = 'forumCreatePostBtn'
;
    createBtn.
className = 'forum-gen-btn'
;
    createBtn.
style.cssText = 'margin-right:10px;cursor:pointer;'
;
    createBtn.
innerHTML = '<i class="fas fa-pencil-alt"></i>'
;
    createBtn.
title = '发布帖子'
;
    createBtn.
onclick = () => this.openCreatePost
();

    // 插入到设置按钮前面
    const settingsBtn = document.getElementById('forumSettingsBtn'
);
    if
 (settingsBtn) {
        settingsBtn.
parentNode.insertBefore
(createBtn, settingsBtn);
    }
}
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


  // 确保首页正确渲染
setTimeout(() => {
    this.render();
}, 0);

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

// 注入挂人帖请求
const exposureInjection = window.ConsequenceGenerator.getExposurePromptInjection();
if (exposureInjection) {
    prompt += exposureInjection.text;
}

if(query) prompt += `\n帖子内容必须与关键词 "${query}" 相关。`;

prompt += `

【极其重要 - 用户身份规则】
1. 禁止使用任何泛称作为用户名包括但不限于：路人甲、路人乙、用户A、网友1、某某、匿名、游客等
2. 每个用户必须有独特的真实名字可以是：
   - 中文名（如：林晓雨、张远航、陈思琪）
   - 英文名/混血名（如：Kevin、小野丽莎、Alex王）
   - 网名/昵称（如：深海泡芙、暴躁老哥、咸鱼本鱼、早睡协会会长）
3. 每个用户说话风格必须独特：
   - 有的人爱用emoji 🤔
   - 有的人说话很简短
   - 有的人喜欢打省略号...
   - 有的人爱用网络流行语
   - 有的人说话很正经学术范

【帖子生成要求】
1. 标题吸引人内容符合板块主题内容要长一些有实质性内容
2. 作者可以是QQ好友（${friends.map(f => f.name).join(', ')}），也可以是有独特名字的论坛用户
3. 每个帖子包含 3-5 条初始评论评论者名字各不相同且有个性
4. 随机生成一些投票贴 (poll)

返回 JSON 数组：
[
    {
        "title": "标题",
        "content": "正文",
        "author": "独特的作者名字",
        "likes": 10,
        "poll": {"question": "投票问题", "options": ["选项1", "选项2"]} 或 null,
        "comments": [{"author": "独特的评论者名字", "content": "评论内容"}]
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

【重要 - 卖家命名规则】
- 禁止使用"卖家""路人"等泛称
- 每个卖家必须有独特真实的名字（中文名/英文名/网名皆可）
- 例如：周小鱼、废品回收王、vintage收藏家小陈、二手达人Lisa

要求：
1. 物品奇特有趣符合世界观
2. 商品描述要详细真实
3. 返回 JSON 数组:
[{"title": "商品名", "price": 99.9, "seller": "卖家独特名字", "desc": "详细描述"}]`;

        
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
            
// ========== 新增：用户发布商品按钮 ==========
    const createItemBtn = document.createElement('div'
);
    createItemBtn.
style.cssText = 'padding:15px;background:#fff;margin-bottom:10px;display:flex;align-items:center;gap:10px;cursor:pointer;border-radius:8px;'
;
    createItemBtn.
innerHTML = 
`
        <div style="width:50px;height:50px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;display:flex;justify-content:center;align-items:center;">
            <i class="fas fa-plus" style="color:#fff;font-size:20px;"></i>
        </div>
        <div>
            <div style="font-weight:bold;">发布闲置</div>
            <div style="font-size:12px;color:#999;">出售你的闲置物品</div>
        </div>
    `
;
    createItemBtn.
onclick = () => this.openCreateMarketItem
();
    list.
appendChild
(createItemBtn);
    // ========== 发布按钮结束 ==========
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
    
// ========== 新增：检查帖子触发的私信队列 ==========
    const dmQueue = JSON.parse(localStorage.getItem('forum_dm_queue') || '[]'
);
    const postTriggeredDM = dmQueue.shift(); // 取出第一个
    if (dmQueue.length > 0
 || postTriggeredDM) {
        localStorage.setItem('forum_dm_queue', JSON.stringify
(dmQueue));
    }
    // ========== 队列检查结束 ==========
    
// 检查报复私信
    const revengeInjection = window.ConsequenceGenerator.getRevengePromptInjection
();

    let
 prompt;
    if
 (revengeInjection) {
        prompt = 
`${revengeInjection.text}`
;
    } 
else if
 (postTriggeredDM) {
        // ========== 新增：处理帖子触发的私信 ==========
        prompt = 
`用户刚在论坛发了一个帖子：「${postTriggeredDM.postTitle}
」

「
${postTriggeredDM.userName}
」看到后想私信用户。
原因：
${postTriggeredDM.reason}

生成这个人发来的1-3条私信。可以是：
- 对帖子感兴趣想聊聊
- 觉得帖子有问题想质问
- 想要帖子里提到的东西
- 单纯想找用户聊天

返回JSON: {"userName": "
${postTriggeredDM.userName}", "messages": ["消息1", "消息2"]}`
;
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
// ============================================
// 打开用户主页
// ============================================
async openUserProfile(userName) {
    // 不能打开自己的主页（用"我"页面代替）
    if (userName === this.store.get().user.name || userName === '我') {
        this.currentTab = 'me';
        document.querySelectorAll('.forum-nav-item').forEach(el => el.classList.remove('active'));
        document.querySelector('.forum-nav-item[data-tab="me"]')?.classList.add('active');
        document.querySelectorAll('.forum-page').forEach(el => el.style.display = 'none');
        document.getElementById('forum-me').style.display = 'block';
        this.renderMe();
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'sub-page';
    modal.style.cssText = 'display:flex;z-index:2000;background:#f5f5f5;';
    modal.innerHTML = `
        <div class="sub-header">
            <button class="back-btn" id="closeUserProfile"><i class="fas fa-chevron-left"></i></button>
            <span class="sub-title">${userName}</span>
            <div style="width:30px;"></div>
        </div>
        <div class="sub-content" style="padding:0;">
            <div style="text-align:center;padding:50px;color:#999;">
                <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
                <p>正在加载用户资料...</p>
            </div>
        </div>
    `;
    document.getElementById('forumApp').appendChild(modal);
    modal.querySelector('#closeUserProfile').onclick = () => modal.remove();

    // 获取或生成用户资料
    const profile = await this.getOrGenerateUserProfile(userName);
    if (!profile) {
        modal.querySelector('.sub-content').innerHTML = '<div style="text-align:center;padding:50px;color:#999;">加载失败</div>';
        return;
    }

    // 检查是否已关注
    const data = this.store.get();
    const isFollowing = (data.userFollowing || []).includes(userName);

    // 渲染主页
    const content = modal.querySelector('.sub-content');
    content.innerHTML = `
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:30px 20px;text-align:center;">
            <div style="width:80px;height:80px;background:#fff;border-radius:50%;margin:0 auto;background-image:url('${profile.avatar}');background-size:cover;border:3px solid #fff;"></div>
            <h2 style="margin:15px 0 5px;">${userName}</h2>
            <p style="opacity:0.9;font-size:13px;">${profile.signature}</p>
            <button id="profileFollowBtn" style="margin-top:15px;padding:8px 30px;border-radius:20px;border:2px solid #fff;background:${isFollowing ? '#fff' : 'transparent'};color:${isFollowing ? '#764ba2' : '#fff'};font-weight:bold;cursor:pointer;">
                ${isFollowing ? '已关注' : '+ 关注'}
            </button>
        </div>

        <div style="display:flex;justify-content:space-around;padding:15px;background:#fff;margin-bottom:10px;">
            <div style="text-align:center;cursor:pointer;" class="stat-item" data-type="followers">
                <div style="font-weight:bold;font-size:18px;">${profile.followers}</div>
                <div style="font-size:12px;color:#999;">粉丝</div>
            </div>
            <div style="text-align:center;cursor:pointer;" class="stat-item" data-type="following">
                <div style="font-weight:bold;font-size:18px;">${profile.following}</div>
                <div style="font-size:12px;color:#999;">关注</div>
            </div>
            <div style="text-align:center;">
                <div style="font-weight:bold;font-size:18px;">${profile.posts.length}</div>
                <div style="font-size:12px;color:#999;">帖子</div>
            </div>
        </div>

        <div style="background:#fff;">
            <div style="display:flex;border-bottom:1px solid #eee;">
                <div class="profile-tab active" data-tab="posts" style="flex:1;text-align:center;padding:12px;cursor:pointer;font-weight:bold;border-bottom:2px solid #333;">帖子</div>
                <div class="profile-tab" data-tab="replies" style="flex:1;text-align:center;padding:12px;cursor:pointer;color:#999;border-bottom:2px solid transparent;">回复</div>
            </div>
            <div id="profilePostsList"></div>
            <div id="profileRepliesList" style="display:none;"></div>
        </div>
    `;

    // Tab切换
    content.querySelectorAll('.profile-tab').forEach(tab => {
        tab.onclick = () => {
            content.querySelectorAll('.profile-tab').forEach(t => {
                t.classList.remove('active');
                t.style.fontWeight = 'normal';
                t.style.color = '#999';
                t.style.borderBottom = '2px solid transparent';
            });
            tab.classList.add('active');
            tab.style.fontWeight = 'bold';
            tab.style.color = '#333';
            tab.style.borderBottom = '2px solid #333';

            const tabType = tab.dataset.tab;
            content.querySelector('#profilePostsList').style.display = tabType === 'posts' ? 'block' : 'none';
            content.querySelector('#profileRepliesList').style.display = tabType === 'replies' ? 'block' : 'none';
        };
    });

    // 渲染帖子列表
    const postsList = content.querySelector('#profilePostsList');
    if (profile.posts.length === 0) {
        postsList.innerHTML = '<div style="text-align:center;padding:30px;color:#999;">暂无帖子</div>';
    } else {
        profile.posts.forEach(p => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:15px;border-bottom:1px solid #f0f0f0;cursor:pointer;';
            div.innerHTML = `
                <div style="font-weight:bold;margin-bottom:5px;">${p.title}</div>
                <div style="font-size:13px;color:#666;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${p.content}</div>
                <div style="font-size:12px;color:#999;margin-top:8px;">
                    <span><i class="far fa-thumbs-up"></i> ${p.likes || 0}</span>
                    <span style="margin-left:15px;"><i class="far fa-comment"></i> ${p.commentCount || 0}</span>
                </div>
            `;
            div.onclick = () => {
                // 查找或创建完整帖子数据并打开
                this.openProfilePost(p, userName, modal);
            };
            postsList.appendChild(div);
        });
    }

    // 渲染回复列表
    const repliesList = content.querySelector('#profileRepliesList');
    if (profile.replies.length === 0) {
        repliesList.innerHTML = '<div style="text-align:center;padding:30px;color:#999;">暂无回复</div>';
    } else {
        profile.replies.forEach(r => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:15px;border-bottom:1px solid #f0f0f0;cursor:pointer;';
            div.innerHTML = `
                <div style="font-size:12px;color:#999;margin-bottom:5px;">回复了帖子「${r.originalPostTitle}」</div>
                <div style="font-size:14px;color:#333;background:#f5f5f5;padding:10px;border-radius:8px;">${r.content}</div>
            `;
            div.onclick = () => {
                this.openProfileReply(r, userName, modal);
            };
            repliesList.appendChild(div);
        });
    }

    // 关注按钮
    content.querySelector('#profileFollowBtn').onclick = () => {
        this.toggleFollow(userName);
        const btn = content.querySelector('#profileFollowBtn');
        const nowFollowing = (this.store.get().userFollowing || []).includes(userName);
        btn.innerText = nowFollowing ? '已关注' : '+ 关注';
        btn.style.background = nowFollowing ? '#fff' : 'transparent';
        btn.style.color = nowFollowing ? '#764ba2' : '#fff';

        // 更新粉丝数显示
        const followersEl = content.querySelector('.stat-item[data-type="followers"] div');
        const currentFollowers = parseInt(followersEl.innerText);
        followersEl.innerText = nowFollowing ? currentFollowers + 1 : Math.max(0, currentFollowers - 1);
    };
}

// ============================================
// 获取或生成用户资料
// ============================================
async getOrGenerateUserProfile(userName) {
    const data = this.store.get();

    // 检查缓存
    if (data.userProfiles && data.userProfiles[userName]) {
        return data.userProfiles[userName];
    }

    // 检查是否是QQ好友
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
    const friend = qqData.friends.find(f => f.name === userName);

    // 获取NPC人设
    const persona = window.BehaviorTracker.generatePersona(userName);

    const apiConfig = window.API.getConfig();
    if (!apiConfig.chatApiKey) {
        // 无API时生成基础资料
        const profile = this.generateBasicProfile(userName, friend, persona);
        this.cacheUserProfile(userName, profile);
        return profile;
    }

    // 调用API生成完整资料
    const settings = this.store.get().settings;
    const prompt = `基于世界观"${settings.worldSetting}"，为论坛用户「${userName}」生成完整个人资料。

${friend ? `这是用户的QQ好友人设：${friend.persona}` : `这是论坛普通用户性格特点：${persona.temperament}`}

要求：
1. 签名要有个性符合性格特点不要太长（15字以内）
2. 生成5个该用户发布过的帖子（标题+简短内容+点赞数+评论数）
3. 生成5个该用户在别人帖子下的回复（原帖标题+回复内容）
4. 帖子和回复内容要符合这个人的性格和说话风格
5. 粉丝数和关注数要合理（普通用户几十到几百活跃用户几百到几千）

返回JSON:
{
    "signature": "个性签名",
    "followers": 数字,
    "following": 数字,
    "posts": [
        {"title": "帖子标题", "content": "帖子内容", "likes": 数字, "commentCount": 数字}
    ],
    "replies": [
        {"originalPostTitle": "原帖标题", "content": "回复内容"}
    ]
}`;

    try {
        const res = await window.API.callAI([{ role: 'user', content: prompt }], apiConfig);
        const result = window.Utils.safeParseJSON(res);

        if (result && result.signature) {
            // 生成头像
            let avatar = '';
            if (friend && friend.avatar) {
                if (friend.avatar.startsWith('img_')) {
                    avatar = await window.db.getImage(friend.avatar) || '';
                } else {
                    avatar = friend.avatar;
                }
            }
            if (!avatar) {
                avatar = window.Utils.generateDefaultAvatar(userName);
            }

            const profile = {
                avatar,
                signature: result.signature,
                followers: result.followers || Math.floor(Math.random() * 500) + 50,
                following: result.following || Math.floor(Math.random() * 200) + 20,
                posts: result.posts || [],
                replies: result.replies || [],
                generatedAt: Date.now()
            };

            this.cacheUserProfile(userName, profile);
            return profile;
        }
    } catch (e) {
        console.error('生成用户资料失败', e);
    }

    // 失败时返回基础资料
    const profile = this.generateBasicProfile(userName, friend, persona);
    this.cacheUserProfile(userName, profile);
    return profile;
}

// 生成基础资料（无API时使用）
generateBasicProfile(userName, friend, persona) {
    const signatures = [
        '生活不止眼前的苟且', '今天也要开心鸭', '佛系养生中...',
        '话少不代表没想法', '正在努力变优秀', '随缘更新',
        '潜水党偶尔冒泡', '人间清醒', '懒癌晚期患者'
    ];

    let avatar = '';
    if (friend && friend.avatar) {
        avatar = friend.avatar;
    } else {
        avatar = window.Utils.generateDefaultAvatar(userName);
    }

    return {
        avatar,
        signature: signatures[Math.floor(Math.random() * signatures.length)],
        followers: Math.floor(Math.random() * 500) + 50,
        following: Math.floor(Math.random() * 200) + 20,
        posts: [],
        replies: [],
        generatedAt: Date.now()
    };
}

// 缓存用户资料
cacheUserProfile(userName, profile) {
    this.store.update(d => {
        if (!d.userProfiles) d.userProfiles = {};
        d.userProfiles[userName] = profile;
    });
}

// 关注/取关
toggleFollow(userName) {
    this.store.update(d => {
        if (!d.userFollowing) d.userFollowing = [];
        const idx = d.userFollowing.indexOf(userName);
        if (idx >= 0) {
            d.userFollowing.splice(idx, 1);
        } else {
            d.userFollowing.push(userName);
        }
    });
}

// 打开用户主页中的帖子详情
async openProfilePost(postData, authorName, parentModal) {
    const fullPost = {
        id: window.Utils.generateId('profile_post'),
        title: postData.title,
        content: postData.content,
        author: authorName,
        authorAvatar: window.Utils.generateDefaultAvatar(authorName),
        time: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
        likes: postData.likes || 0,
        comments: [],
        poll: null
    };

    // 生成评论
    const apiConfig = window.API.getConfig();
    if (apiConfig.chatApiKey && postData.commentCount > 0) {
        const settings = this.store.get().settings;
        const prompt = `基于世界观"${settings.worldSetting}"，为帖子生成${Math.min(postData.commentCount, 5)}条评论。

帖子标题：${postData.title}
帖子内容：${postData.content}
作者：${authorName}

【重要】每个评论者必须有独特的名字和说话风格：
- 名字要真实多样（中文名/英文名/网名/昵称都可以），禁止使用"路人""用户""网友"等泛称
- 每个人说话风格要不同（有的简短、有的啰嗦、有的用emoji、有的很正经）
- 评论内容要有互动感可以赞同/反驳/提问/开玩笑

返回JSON数组：[{"author": "独特的名字", "content": "评论内容"}]`;

        try {
            const res = await window.API.callAI([{ role: 'user', content: prompt }], apiConfig);
            const comments = window.Utils.safeParseJSON(res);
            if (Array.isArray(comments)) {
                fullPost.comments = comments.map(c => ({
                    author: c.author,
                    content: c.content,
                    time: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)
                }));
            }
        } catch (e) {
            console.error('生成评论失败', e);
        }
    }

    this.openPost(fullPost);
}

// 打开用户主页中的回复详情（显示原帖）
async openProfileReply(replyData, authorName, parentModal) {
    // 生成原帖
    const apiConfig = window.API.getConfig();
    const settings = this.store.get().settings;

    let originalPost = {
        id: window.Utils.generateId('origin_post'),
        title: replyData.originalPostTitle,
        content: '帖子内容加载中...',
        author: '楼主',
        authorAvatar: '',
        time: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
        likes: Math.floor(Math.random() * 100),
        comments: [{
            author: authorName,
            content: replyData.content,
            time: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
        }],
        poll: null
    };

    if (apiConfig.chatApiKey) {
        const prompt = `基于世界观"${settings.worldSetting}"，根据帖子标题生成完整帖子内容和其他评论。

帖子标题：${replyData.originalPostTitle}
已有评论：${authorName}说"${replyData.content}"

要求：
1. 生成帖子正文内容（100-200字）
2. 楼主名字要独特真实禁止使用"楼主""发帖人"等泛称
3. 生成3-5条其他评论每个评论者名字独特、风格不同
4. 把"${authorName}"的评论也包含进去

返回JSON:
{
    "author": "楼主独特名字",
    "content": "帖子正文",
    "comments": [{"author": "独特名字", "content": "评论内容"}]
}`;

        try {
            const res = await window.API.callAI([{ role: 'user', content: prompt }], apiConfig);
            const result = window.Utils.safeParseJSON(res);
            if (result) {
                originalPost.author = result.author || '匿名用户';
                originalPost.content = result.content || '';
                originalPost.authorAvatar = window.Utils.generateDefaultAvatar(originalPost.author);
                if (Array.isArray(result.comments)) {
                    originalPost.comments = result.comments.map(c => ({
                        author: c.author,
                        content: c.content,
                        time: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
                    }));
                }
            }
        } catch (e) {
            console.error('生成原帖失败', e);
        }
    }

    this.openPost(originalPost);
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
 <div style="font-weight:bold;font-size:14px;color:#1a73e8;cursor:pointer;" class="clickable-author" data-author="${post.author}">${post.author}</div>

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
        
let renderComments = () => {

            const list = modal.querySelector('#postComments');
            list.innerHTML = '';
            if(post.comments.length === 0) list.innerHTML = '<div style="color:#999;">暂无评论</div>';
            post.comments.forEach(c => {
                const div = document.createElement('div');
                div.className = 'forum-comment';
                div.style.cssText = 'padding:10px 0; border-bottom:1px solid #f5f5f5;';
                div.innerHTML = `
                    <div style="display:flex;justify-content:space-between;">
 <div style="font-weight:bold;font-size:12px;color:#1a73e8;cursor:pointer;" class="clickable-author" data-author="${c.author}">${c.author}</div>

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
    
// ========== 在这里插入互动记录代码 ==========

// ========== 记录互动（仅记录用户行为不预设任何回复） ==========
const replyMatch = text.match(/^回复\s*(.+?)[:：]/);
const targetName = replyMatch ? replyMatch[1].trim() : (post.author !== data.user.name ? post.author : null);

if (targetName && targetName !== data.user.name) {
    const severity = window.BehaviorTracker.detectArgumentSeverity(text);
    let sentiment = 'neutral';

    if (severity === 'severe' || severity === 'moderate') {
        sentiment = 'negative';
    } else if (/谢谢|感谢|同意|说得对|赞|支持|好文|写得好|顶/.test(text)) {
        sentiment = 'positive';
    }

    window.BehaviorTracker.recordInteraction(
        targetName,
        replyMatch ? 'reply' : 'comment',
        sentiment,
        text.substring(0, 50)
    );
}
// ========== 互动记录结束 ==========


    // ========== 吵架检测（修正版） ==========
    const severity = window.BehaviorTracker.detectArgumentSeverity(text);
    if (severity) {
        let targetName = null;

        // 判断回复对象
        const replyMatch = text.match(/^回复\s*(.+?)[:：]/);

        if (replyMatch) {
            // 如果是"回复 xxx:"格式 → 被回复的人生气
            targetName = replyMatch[1].trim();
        } else {
            // 如果直接在主楼评论 → 楼主生气
            if (post.author !== data.user.name) {
                targetName = post.author;
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

    // 保存评论
    this.store.update(d => {
        const p = d.posts.find(x => x.id === post.id);
        if(p) p.comments.push(newComment);
        d.user.stats.replies++;
        d.user.history.replies.push(post.id);
    });
    post.comments.push(newComment);
    input.value = '';
    renderComments();

    // ========== AI 回复（修正版） ==========
    const apiConfig = window.API.getConfig();
    if(apiConfig.chatApiKey) {
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        const friendNames = qqData.friends.map(f => `${f.name}（人设：${f.persona?.substring(0,50) || '未知'}）`).join('\n');

        // 判断用户是否回复了某人
        const replyMatch = text.match(/^回复\s*(.+?)[:：]/);
        const replyTarget = replyMatch ? replyMatch[1].trim() : null;

const prompt = 
`[论坛评论互动]

【帖子信息】
标题：
${post.title}
楼主：
${post.author}
内容：
${post.content.substring(0,100)}

【已有评论】
${post.comments.slice(-8).map((c, idx) => `#${idx+1} ${c.author}: ${c.content}`).join('\n')}

【最新评论】
${data.user.name}: "${text}
"
${replyTarget ? `（这是回复给 ${replyTarget} 的）` : `（这是直接评论主楼的）`}

【你认识的人】
${friendNames || '无'}
楼主：
${post.author}

【极其重要 - 评论者命名规则】
- 禁止使用"路人""网友""用户"等任何泛称
- 每个评论者必须有独特的真实名字
- 名字风格多样：中文名、英文名、个性网名都可以
- 每个人说话风格要不同

【任务】
生成2-5条新评论继续这个讨论。

【重要规则】
1. 评论者可以：
   - 回复用户的评论
   - 回复其他评论者的评论（用"回复 @xxx："格式）
   - 直接评论主楼
   - 评论者之间互相讨论/争论/附和
2. 
${replyTarget ? `被回复的 ${replyTarget} 大概率会回复` : `楼主 ${post.author} 可能会回复`}
3. 已有评论中的人可能继续参与讨论
4. 评论内容要有互动感形成对话链

【禁止】
- 禁止所有人都赞同用户
- 禁止空洞的回复
- 禁止忽略已有的对话脉络

返回JSON数组：[{"author":"名字","content":"回复内容","replyTo":"被回复人名字或null"}]`
;



    
try
 {
        const res = await window.API.callAI([{role:'user', content
:prompt}], apiConfig);
        const replies = window.Utils.safeParseJSON
(res);

        if(Array.isArray(replies) && replies.length > 0
) {
            this.store.update(d =>
 {
                const p = d.posts.find(x => x.id === post.id
);
                if
(p) {
                    replies.
forEach(r =>
 {
                        if(r.author && r.content
) {
                            p.
comments.push
({
                                author: r.author
,
                                content: r.content, // 直接用AI返回的完整内容
                                time: Date.now
()
                            });
                        }
                    });
                }
            });
            replies.
forEach(r =>
 {
                if(r.author && r.content
) {
                    post.
comments.push
({
                        author: r.author
,
                        content: r.content
,
                        time: Date.now
()
                    });
                }
            });
            renderComments
();
        }
    } 
catch
(e) {
        console.error('AI回复生成失败:'
, e);
    }
}
    // ========== AI 回复结束 ==========
};
// 绑定用户名点击事件
modal.querySelectorAll('.clickable-author').forEach(el => {
    el.onclick = (e) => {
        e.stopPropagation();
        const authorName = el.dataset.author;
        this.openUserProfile(authorName);
    };
});

// 动态绑定新评论的用户名点击
const originalRenderComments = renderComments;
renderComments = () => {
    originalRenderComments();
    modal.querySelectorAll('.clickable-author').forEach(el => {
        el.onclick = (e) => {
            e.stopPropagation();
            this.openUserProfile(el.dataset.author);
        };
    });
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
    
// ========== 在这里插入互动记录 ==========

    // 记录私信互动
    let sentiment = 'neutral'
;
    const severity = window.BehaviorTracker.detectArgumentSeverity
(text);
    if
 (severity) {
        sentiment = 
'negative'
;
    } 
else if (text.includes('谢') || text.includes('好的') || text.includes('可以'
)) {
        sentiment = 
'positive'
;
    }

    window.BehaviorTracker.recordInteraction
(
        chat.
userName
,
        'chat'
,
        sentiment,
        text.
substring(0, 50
)
    );
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
        content: '此操作将清除所有论坛数据包括：\n• 所有帖子和评论\n• 所有板块\n• 所有私信记录\n• 所有交易商品\n• 浏览历史和收藏\n• 行为追踪记录（吵架/砍价/被挂）\n• NPC人设缓存\n• 互动记忆数据\n\n此操作不可恢复确定要继续吗？',
        buttons: [
            { text: '确认清除', class: 'confirm', value: 'confirm', style: 'background:#ff4d4f;border-color:#ff4d4f;' },
            { text: '取消', class: 'cancel', value: false }
        ]
    }).then(async (res) => {
        if (res.action === 'confirm') {
            // 1. 重置 forum_data 为初始状态
            const initialData = {
                posts: [],
                boards: [],
                marketItems: [],
                chats: [],
                userProfiles: {},
                userFollowing: [],
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

            // 2. 清除行为追踪数据
            localStorage.removeItem('forum_behavior_data');
            // 重新初始化 BehaviorTracker
            if (window.BehaviorTracker) {
                window.BehaviorTracker.init();
            }

            // 3. 清除私信队列
            localStorage.removeItem('forum_dm_queue');

            // 4. 清除 IndexedDB 中论坛相关的图片
            try {
                if (window.db && window.db.clearImages) {
                    await window.db.clearImages();
                }
            } catch (e) {
                console.warn('清除图片缓存失败', e);
            }

            // 5. 关闭设置弹窗
            if (settingsModal) {
                settingsModal.remove();
            }

            // 6. 重置当前板块ID
            this.currentBoardId = null;

            // 7. 重新渲染当前页面
            this.render();

            // 8. 显示清除成功提示
            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(82,196,26,0.95);color:#fff;padding:15px 25px;border-radius:10px;z-index:9999;font-size:14px;box-shadow:0 4px 15px rgba(0,0,0,0.3);';
            toast.innerHTML = '<i class="fas fa-check-circle"></i> 所有数据已清除！';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2500);

            console.log('[论坛] 已清除所有数据：forum_data, forum_behavior_data, forum_dm_queue, IndexedDB图片');
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


<div style="margin-top:20px;">
    <h3 style="color:#fd79a8;margin:0 0 10px;"><i class="fas fa-history"></i> 互动记录 (${Object.keys(data.interactions || {}).length} 人)</h3>
    <div style="max-height:200px;overflow-y:auto;background:#0f0f23;border-radius:8px;padding:10px;">
        ${Object.keys(data.interactions || {}).length === 0 ? '<div style="color:#666;">暂无互动记录</div>' :
            Object.entries(data.interactions || {}).map(([name, records]) => {
                const familiarity = window.BehaviorTracker.getFamiliarityLevel(name);
                const summary = window.BehaviorTracker.getRelationshipSummary(name);
                return `
                    <div style="padding:8px;border-bottom:1px solid #333;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="color:#fd79a8;">${name}</span>
                            <span style="font-size:11px;color:${familiarity.canRecognize ? '#2ed573' : '#666'};">
                                ${familiarity.canRecognize ? '✓ 能认出' : '✗ 不认识'} (分数:${familiarity.score})
                            </span>
                        </div>
                        <div style="font-size:11px;color:#888;margin-top:3px;">
                            共${records.length}次互动 |
                            ${summary ? `印象:${summary.overallImpression} | 正面:${summary.positiveCount} 负面:${summary.negativeCount}` : ''}
                        </div>
                        <div style="font-size:10px;color:#555;margin-top:3px;">
                            最近: ${records.slice(-3).map(r => `${r.type}(${r.sentiment})`).join(', ')}
                        </div>
                    </div>
                `;
            }).join('')}
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

// ============================================
// 用户发帖功能
// ============================================
openCreatePost() {
    const data = this.store.get();
    const boards = data.boards || [];

    const modal = document.createElement('div');
    modal.className = 'sub-page';
    modal.style.cssText = 'display:flex;z-index:2000;background:#f5f5f5;';

    modal.innerHTML = `
        <div class="sub-header">
            <button class="back-btn" id="closeCreatePost"><i class="fas fa-chevron-left"></i></button>
            <span class="sub-title">发布帖子</span>
            <button id="submitPostBtn" style="background:#333;color:#fff;border:none;padding:6px 15px;border-radius:15px;font-size:13px;">发布</button>
        </div>
        <div class="sub-content" style="padding:15px;">
            <div class="form-group" style="margin-bottom:15px;">
                <label style="display:block;font-weight:bold;margin-bottom:5px;">选择板块</label>
                <select id="postBoardSelect" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;">
                    <option value="general">综合区</option>
                    ${boards.map(b => `<option value="${b.id}">${b.icon || '📁'} ${b.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" style="margin-bottom:15px;">
                <label style="display:block;font-weight:bold;margin-bottom:5px;">标题</label>
                <input id="postTitleInput" type="text" placeholder="请输入标题..." style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">
            </div>
            <div class="form-group" style="margin-bottom:15px;">
                <label style="display:block;font-weight:bold;margin-bottom:5px;">正文</label>
                <textarea id="postContentInput" placeholder="写点什么..." style="width:100%;height:200px;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;resize:none;box-sizing:border-box;"></textarea>
            </div>
            <div class="form-group">
                <label style="display:block;font-weight:bold;margin-bottom:5px;">添加图片（可选）</label>
                <div id="postImagePreview" style="width:100%;height:150px;border:2px dashed #ddd;border-radius:8px;display:flex;justify-content:center;align-items:center;cursor:pointer;background:#fafafa;overflow:hidden;">
                    <div style="text-align:center;color:#999;">
                        <i class="fas fa-image" style="font-size:30px;"></i>
                        <div style="margin-top:5px;font-size:12px;">点击上传图片</div>
                    </div>
                </div>
                <input type="file" id="postImageInput" hidden accept="image/*">
            </div>
        </div>
    `;

    document.getElementById('forumApp').appendChild(modal);

    let selectedImage = null;

    modal.querySelector('#closeCreatePost').onclick = () => modal.remove();

    // 图片上传
    modal.querySelector('#postImagePreview').onclick = () => {
        modal.querySelector('#postImageInput').click();
    };

    modal.querySelector('#postImageInput').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                selectedImage = evt.target.result;
                modal.querySelector('#postImagePreview').innerHTML = `
                    <img src="${selectedImage}" style="width:100%;height:100%;object-fit:cover;">
                `;
            };
            reader.readAsDataURL(file);
        }
    };

    // 发布按钮
    modal.querySelector('#submitPostBtn').onclick = async () => {
        const title = modal.querySelector('#postTitleInput').value.trim();
        const content = modal.querySelector('#postContentInput').value.trim();
        const boardId = modal.querySelector('#postBoardSelect').value;

        if (!title) return alert('请输入标题');
        if (!content) return alert('请输入正文');

        const btn = modal.querySelector('#submitPostBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        await this.submitUserPost(title, content, boardId, selectedImage, modal);
    };
}

// ============================================
// 提交用户帖子并生成评论
// ============================================
async submitUserPost(title, content, boardId, imageBase64, modal) {
    const data = this.store.get();
    const user = data.user;

    // 保存图片到数据库
    let imageId = null;
    if (imageBase64) {
        imageId = await window.db.saveImage(imageBase64);
    } else {
        const imgBase64 = window.Utils.generateDefaultImage(title);
        imageId = await window.db.saveImage(imgBase64);
    }

    // 获取用户头像
    let userAvatar = user.avatar;
    if (!userAvatar) {
        userAvatar = window.Utils.generateDefaultAvatar(user.name);
    }

    // 创建帖子
    const newPost = {
        id: window.Utils.generateId('post'),
        boardId: boardId,
        title: title,
        content: content,
        author: user.name,
        authorAvatar: userAvatar,
        time: Date.now(),
        likes: 0,
        poll: null,
        comments: [],
        image: imageId,
        isUserPost: true // 标记为用户发的帖子
    };

    // 先保存帖子
    this.store.update(d => {
        d.posts.unshift(newPost);
        d.user.stats.posts++;
        d.user.history.posts.push(newPost.id);
    });

    // 关闭发帖弹窗
    modal.remove();

    // 显示发布成功提示
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:15px 25px;border-radius:10px;z-index:9999;font-size:14px;';
    toast.innerHTML = '<i class="fas fa-check-circle"></i> 发布成功正在等待回复...';
    document.body.appendChild(toast);

    // 切换到首页
    this.currentTab = 'home';
    document.querySelectorAll('.forum-nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector('.forum-nav-item[data-tab="home"]')?.classList.add('active');
    document.querySelectorAll('.forum-page').forEach(el => el.style.display = 'none');
    document.getElementById('forum-home').style.display = 'block';
    this.renderHome();

    // 调用API生成评论
    await this.generateCommentsForUserPost(newPost, toast);
}

// ============================================
// 为用户帖子生成评论（包含仇家找茬逻辑）
// ============================================
async generateCommentsForUserPost(post, toast) {
    const apiConfig = window.API.getConfig();
    if (!apiConfig.chatApiKey) {
        toast.innerHTML = '<i class="fas fa-exclamation-circle"></i> 未配置API无法生成评论';
        setTimeout(() => toast.remove(), 2000);
        return;
    }

    const settings = this.store.get().settings;
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
    const friends = qqData.friends;
    const behaviorData = window.BehaviorTracker.get();

    // 检查是否有仇家（未报复的吵架记录）
    const enemies = behaviorData.arguments
        .filter(a => !a.revenged && Date.now() - a.time < 7 * 24 * 60 * 60 * 1000) // 7天内
        .map(a => ({
            name: a.targetName,
            persona: a.targetPersona,
            reason: a.userComment,
            severity: a.severity
        }));

    // 检查被挂过的卖家（可能来找茬）
    const angryBargainers = behaviorData.bargains
        .filter(b => b.ratio < 0.5 && Date.now() - b.time < 7 * 24 * 60 * 60 * 1000)
        .map(b => ({
            name: b.sellerName,
            persona: b.sellerPersona,
            reason: `砍价到${Math.round(b.ratio * 100)}%`,
            item: b.itemTitle
        }));

    let enemyPrompt = '';
    if (enemies.length > 0 || angryBargainers.length > 0) {
        enemyPrompt = `
【重要：必须包含仇家评论】
以下人看到了用户的帖子他们和用户有过节：
${enemies.map(e => `- ${e.name}（性格：${e.persona.temperament}）：之前和用户吵过架（用户说了"${e.reason.substring(0, 30)}..."）`).join('\n')}
${angryBargainers.map(b => `- ${b.name}（性格：${b.persona.temperament}）：之前被用户砍价太狠（${b.reason}买${b.item}）`).join('\n')}

这些仇家的评论必须带有敌意：阴阳怪气/直接开骂/讽刺挖苦/翻旧账。根据他们的性格决定攻击程度。
`;
// ========== 在 enemyPrompt 后面添加以下代码 ==========

// 获取所有认识用户的NPC
const recognizingNPCs = window.BehaviorTracker.getAllRecognizingNPCs
();

let recognitionPrompt = ''
;
if (recognizingNPCs.length > 0
) {
    recognitionPrompt = 
`
【重要：以下人认识用户可能会在评论区认出ta】
${recognizingNPCs.map(npc => {
    const recentEventsText = npc.recentEvents.length > 0
        ? 
`最近互动：${npc.recentEvents.map(e => `${e.type}(${e.sentiment}): ${e.summary}`).join('；')}`
        : 
'暂无近期互动'
;

    let recognitionBehavior = ''
;
    if (npc.overallImpression === '负面'
) {
        recognitionBehavior = 
'可能会阴阳怪气/翻旧账/表现冷淡/讽刺'
;
    } 
else if (npc.overallImpression === '正面'
) {
        recognitionBehavior = 
'可能会热情打招呼/支持/帮腔'
;
    } 
else
 {
        recognitionBehavior = 
'可能会打招呼/正常互动'
;
    }

    return `- ${npc.npcName}（熟悉度：${npc.familiarityText}，总印象：${npc.overallImpression}，性格：${npc.persona.temperament}
）
      互动
${npc.interactionCount}次（正面${npc.positiveCount}/负面${npc.negativeCount}
）
      ${recentEventsText}
      认出时可能表现：
${recognitionBehavior}`
;
}).join(
'\n')}

这些人如果评论必须体现出"认出用户"的感觉：
- 用"又是你""你怎么又来了""上次那个xxx的不是你吗"等表达
- 根据历史互动决定态度：负面记忆多就冷淡/敌意正面记忆多就友好
- 可以提起之前的事情（翻旧账或者友好回忆）
`
;
}


    }
    // ========== 获取所有认识用户的NPC ==========
    const recognizingNPCs = window.BehaviorTracker.getAllRecognizingNPCs();

    let recognitionPrompt = '';
    if (recognizingNPCs.length > 0) {
        recognitionPrompt = `
【重要：以下人认识用户可能会在评论区认出ta】
${recognizingNPCs.map(npc => {
    const recentEventsText = npc.recentEvents.length > 0
        ? `最近互动：${npc.recentEvents.map(e => `${e.type}(${e.sentiment}): ${e.summary}`).join('；')}`
        : '暂无近期互动';

    let recognitionBehavior = '';
    if (npc.overallImpression === '负面') {
        recognitionBehavior = '可能会阴阳怪气/翻旧账/表现冷淡/讽刺';
    } else if (npc.overallImpression === '正面') {
        recognitionBehavior = '可能会热情打招呼/支持/帮腔';
    } else {
        recognitionBehavior = '可能会打招呼/正常互动';
    }

    return `- ${npc.npcName}（熟悉度：${npc.familiarityText}，总印象：${npc.overallImpression}，性格：${npc.persona.temperament}）
      互动${npc.interactionCount}次（正面${npc.positiveCount}/负面${npc.negativeCount}）
      ${recentEventsText}
      认出时可能表现：${recognitionBehavior}`;
}).join('\n')}

这些人如果评论必须体现出"认出用户"的感觉：
- 用"又是你""你怎么又来了""上次那个xxx的不是你吗"等表达
- 根据历史互动决定态度：负面记忆多就冷淡/敌意正面记忆多就友好
- 可以提起之前的事情（翻旧账或者友好回忆）
`;
    }
    // ========== 认识用户的NPC处理结束 ==========

    // 分析帖子内容可能引起的反应
    const contentAnalysis = this.analyzePostContent(post.content);

const prompt = `基于世界观"${settings.worldSetting}
"，为用户发布的帖子生成评论。

【帖子信息】
标题：
${post.title}
正文：
${post.content}
发帖人：
${post.author}

${enemyPrompt}
${recognitionPrompt}



【用户的好友（可能会评论）】
${friends.map(f => `- ${f.name}（人设：${f.persona?.substring(0, 50) || '普通朋友'}）`).join('\n') || '无'}

【内容分析】
${contentAnalysis}

【生成要求】
1. 生成 8-15 条评论数量要够
2. 评论者类型多样：
   - 好友（${friends.map(f => f.name).join('、') || '无'}）可能出现1-3个
   - 仇家（如果有）必须出现
   - 路人网友（用独特的名字如：深夜游民、暴躁老哥、小镇青年等禁止用"路人""网友"）
3. 评论风格多样：
   - 有人简短"顶""沙发""前排"
   - 有人认真讨论
   - 有人抬杠
   - 有人玩梗
   - 有人阴阳怪气
   - 有人问问题
   - 仇家来找茬
4. 部分评论可以互相回复形成楼中楼使用"回复 @xxx："格式
5. 同时生成点赞数（50-500随机）

【禁止】
- 禁止所有评论都是正面的
- 禁止使用"路人""网友""用户"等泛称作为用户名
- 禁止评论内容雷同

返回JSON:
{
    "likes": 数字,
    "comments": [
        {"author": "独特名字", "content": "评论内容", "isEnemy": true/false, "replyTo": "被回复人名字或null"}
    ],
    "triggeredDM": {"userName": "可能私信用户的人名", "reason": "私信原因"} 或 null
}`;

    try {
        const res = await window.API.callAI([{ role: 'user', content: prompt }], apiConfig);
        const result = window.Utils.safeParseJSON(res);

        if (result && result.comments) {
            const comments = result.comments.map(c => {
                let content = c.content;
                // 如果是回复某人添加格式
                if (c.replyTo) {
                    content = `回复 @${c.replyTo}：${c.content}`;
                }
                return {
                    author: c.author,
                    content: content,
                    time: Date.now() - Math.floor(Math.random() * 60 * 60 * 1000),
                    isEnemy: c.isEnemy || false
                };
            });

            // 更新帖子
            this.store.update(d => {
                const p = d.posts.find(x => x.id === post.id);
                if (p) {
                    p.comments = comments;
                    p.likes = result.likes || Math.floor(Math.random() * 300) + 50;
                }
            });
// ========== 记录NPC主动与用户的互动 ==========
comments.forEach(c => {
    if (c.author === post.author) return;

    let sentiment = 'neutral';
    if (c.isEnemy || window.BehaviorTracker.detectArgumentSeverity(c.content)) {
        sentiment = 'negative';
    } else if (/支持|好文|顶|写得好|赞/.test(c.content)) {
        sentiment = 'positive';
    }

    window.BehaviorTracker.recordInteraction(
        c.author,
        'comment',
        sentiment,
        `评论了用户帖子：${c.content.substring(0, 30)}`
    );
});
// ========== NPC互动记录结束 ==========

            // 如果有仇家评论标记报复完成
            const enemyCommenters = comments.filter(c => c.isEnemy).map(c => c.author);
            if (enemyCommenters.length > 0) {
                behaviorData.arguments.forEach(a => {
                    if (enemyCommenters.includes(a.targetName)) {
                        window.BehaviorTracker.markRevenged(a.id);
                    }
                });
            }

            // 处理可能触发的私信（不额外调用API，记录到队列）
            if (result.triggeredDM && result.triggeredDM.userName) {
                this.queueTriggeredDM(result.triggeredDM, post);
            }

            toast.innerHTML = `<i class="fas fa-check-circle"></i> 收到 ${comments.length} 条评论！`;
            setTimeout(() => toast.remove(), 2000);

            // 如果有仇家评论额外提示
            if (enemyCommenters.length > 0) {
                setTimeout(() => {
                    const warning = document.createElement('div');
                    warning.style.cssText = 'position:fixed;top:30%;left:50%;transform:translateX(-50%);background:rgba(255,77,79,0.95);color:#fff;padding:15px 25px;border-radius:10px;z-index:9999;font-size:14px;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,0.3);';
                    warning.innerHTML = `
                        <div><i class="fas fa-angry"></i> 有人来找茬了...</div>
                        <div style="font-size:12px;margin-top:5px;opacity:0.8;">${enemyCommenters.join('、')} 在你的帖子下评论</div>
                    `;
                    document.body.appendChild(warning);
                    setTimeout(() => warning.remove(), 3000);
                }, 500);
            }

            this.renderHome();
        }
    } catch (e) {
        console.error('生成评论失败', e);
        toast.innerHTML = '<i class="fas fa-exclamation-circle"></i> 生成评论失败';
        setTimeout(() => toast.remove(), 2000);
    }
}

// ============================================
// 分析帖子内容（判断可能引起的反应）
// ============================================
analyzePostContent(content) {
    const analysis = [];

    // 检测炫耀内容
    const showOffKeywords = ['入手', '到货', '开箱', '终于买了', '剁手', '新入', '晒一下'];
    if (showOffKeywords.some(k => content.includes(k))) {
        analysis.push('帖子有炫耀性质可能引起羡慕或酸言酸语');
    }

    // 检测求助内容
    const helpKeywords = ['求助', '怎么办', '救命', '急', '在线等', '有没有人'];
    if (helpKeywords.some(k => content.includes(k))) {
        analysis.push('帖子是求助贴可能有人热心帮忙也可能有人嘲讽');
    }

    // 检测争议内容
    const controversyKeywords = ['觉得', '认为', '应该', '不应该', '为什么', '凭什么'];
    if (controversyKeywords.some(k => content.includes(k))) {
        analysis.push('帖子带有观点性可能引发讨论或争论');
    }

    // 检测吐槽内容
    const complaintKeywords = ['吐槽', '无语', '服了', '离谱', '垃圾', '坑'];
    if (complaintKeywords.some(k => content.includes(k))) {
        analysis.push('帖子是吐槽贴可能有人附和也可能有人反驳');
    }

    return analysis.length > 0 ? analysis.join('\n') : '普通帖子可能有正常讨论';
}

// ============================================
// 记录待触发的私信（不额外调用API）
// ============================================
queueTriggeredDM(dmInfo, post) {
    // 存储到 localStorage 供下次生成私信时使用
    const queue = JSON.parse(localStorage.getItem('forum_dm_queue') || '[]');
    queue.push({
        userName: dmInfo.userName,
        reason: dmInfo.reason,
        postId: post.id,
        postTitle: post.title,
        time: Date.now()
    });
    localStorage.setItem('forum_dm_queue', JSON.stringify(queue));
    console.log(`[论坛] 私信队列已添加：${dmInfo.userName} 可能会私信用户`);
}
// ============================================
// 用户发布商品 - 打开发布弹窗
// ============================================
openCreateMarketItem() {
    const modal = document.createElement('div');
    modal.className = 'sub-page';
    modal.style.cssText = 'display:flex;z-index:2000;background:#f5f5f5;';

    modal.innerHTML = `
        <div class="sub-header">
            <button class="back-btn" id="closeCreateItem"><i class="fas fa-chevron-left"></i></button>
            <span class="sub-title">发布闲置</span>
            <button id="submitItemBtn" style="background:#ff5000;color:#fff;border:none;padding:6px 15px;border-radius:15px;font-size:13px;">发布</button>
        </div>
        <div class="sub-content" style="padding:15px;">
            <div class="form-group" style="margin-bottom:15px;">
                <label style="display:block;font-weight:bold;margin-bottom:5px;">商品图片</label>
                <div id="itemImagePreview" style="width:100%;height:180px;border:2px dashed #ddd;border-radius:12px;display:flex;justify-content:center;align-items:center;cursor:pointer;background:#fafafa;overflow:hidden;">
                    <div style="text-align:center;color:#999;">
                        <i class="fas fa-camera" style="font-size:36px;"></i>
                        <div style="margin-top:8px;font-size:13px;">点击上传商品图片</div>
                    </div>
                </div>
                <input type="file" id="itemImageInput" hidden accept="image/*">
            </div>
            <div class="form-group" style="margin-bottom:15px;">
                <label style="display:block;font-weight:bold;margin-bottom:5px;">商品标题</label>
                <input id="itemTitleInput" type="text" placeholder="如：九成新机械键盘" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">
            </div>
            <div class="form-group" style="margin-bottom:15px;">
                <label style="display:block;font-weight:bold;margin-bottom:5px;">价格 (元)</label>
                <div style="position:relative;">
                    <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#ff5000;font-weight:bold;">¥</span>
                    <input id="itemPriceInput" type="number" placeholder="0.00" style="width:100%;padding:12px 12px 12px 30px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">
                </div>
            </div>
            <div class="form-group" style="margin-bottom:15px;">
                <label style="display:block;font-weight:bold;margin-bottom:5px;">商品描述</label>
                <textarea id="itemDescInput" placeholder="描述商品成色、使用情况、转手原因等..." style="width:100%;height:120px;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;resize:none;box-sizing:border-box;"></textarea>
            </div>
            <div style="background:#fff5f0;border:1px solid #ffccc7;border-radius:8px;padding:12px;margin-bottom:15px;">
                <div style="font-size:12px;color:#ff4d4f;">
                    <i class="fas fa-info-circle"></i> 发布后可能会收到私信咨询请注意查看
                </div>
            </div>
        </div>
    `;

    document.getElementById('forumApp').appendChild(modal);

    let selectedImage = null;

    modal.querySelector('#closeCreateItem').onclick = () => modal.remove();

    // 图片上传
    modal.querySelector('#itemImagePreview').onclick = () => {
        modal.querySelector('#itemImageInput').click();
    };

    modal.querySelector('#itemImageInput').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                selectedImage = evt.target.result;
                modal.querySelector('#itemImagePreview').innerHTML = `
                    <img src="${selectedImage}" style="width:100%;height:100%;object-fit:cover;">
                `;
            };
            reader.readAsDataURL(file);
        }
    };

    // 发布按钮
    modal.querySelector('#submitItemBtn').onclick = async () => {
        const title = modal.querySelector('#itemTitleInput').value.trim();
        const price = parseFloat(modal.querySelector('#itemPriceInput').value);
        const desc = modal.querySelector('#itemDescInput').value.trim();

        if (!title) return alert('请输入商品标题');
        if (isNaN(price) || price <= 0) return alert('请输入有效价格');
        if (!desc) return alert('请输入商品描述');

        const btn = modal.querySelector('#submitItemBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        await this.submitUserMarketItem(title, price, desc, selectedImage, modal);
    };
}

// ============================================
// 用户发布商品 - 提交并生成私信
// ============================================
async submitUserMarketItem(title, price, desc, imageBase64, modal) {
    const data = this.store.get();
    const user = data.user;

    // 保存图片
    let imageId = null;
    if (imageBase64) {
        imageId = await window.db.saveImage(imageBase64);
    } else {
        const imgBase64 = window.Utils.generateDefaultImage(title);
        imageId = await window.db.saveImage(imgBase64);
    }

    // 获取用户头像
    let userAvatar = user.avatar;
    if (!userAvatar) {
        userAvatar = window.Utils.generateDefaultAvatar(user.name);
    }
    if (userAvatar && !userAvatar.startsWith('img_') && !userAvatar.startsWith('data:') && !userAvatar.startsWith('http')) {
        const avatarId = await window.db.saveImage(userAvatar);
        userAvatar = avatarId;
    }

    // 创建商品
    const newItem = {
        id: window.Utils.generateId('item'),
        title: title,
        price: price,
        seller: user.name,
        sellerAvatar: userAvatar,
        desc: desc,
        image: imageId,
        comments: [],
        status: 'selling',
        isUserItem: true, // 标记为用户发布的商品
        publishedAt: Date.now()
    };

    // 保存商品
    this.store.update(d => {
        d.marketItems.unshift(newItem);
    });

    // 关闭发布弹窗
    modal.remove();

    // 显示发布成功提示
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(255,80,0,0.95);color:#fff;padding:15px 25px;border-radius:10px;z-index:9999;font-size:14px;box-shadow:0 4px 15px rgba(0,0,0,0.3);';
    toast.innerHTML = '<i class="fas fa-check-circle"></i> 发布成功等待买家咨询...';
    document.body.appendChild(toast);

    // 刷新市场页面
    this.renderMarket();

    // 生成私信咨询
    await this.generateResponsesForUserItem(newItem, toast);
}

// ============================================
// 为用户发布的商品生成私信咨询
// ============================================
async generateResponsesForUserItem(item, toast) {
    const apiConfig = window.API.getConfig();
    if (!apiConfig.chatApiKey) {
        toast.innerHTML = '<i class="fas fa-exclamation-circle"></i> 未配置API，无法生成咨询';
        setTimeout(() => toast.remove(), 2000);
        return;
    }

    const settings = this.store.get().settings;
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
    const friends = qqData.friends;
    const behaviorData = window.BehaviorTracker.get();

    // 获取仇家信息
    const enemies = behaviorData.arguments
        .filter(a => !a.revenged && Date.now() - a.time < 7 * 24 * 60 * 60 * 1000)
        .map(a => ({
            name: a.targetName,
            persona: a.targetPersona,
            reason: `和用户吵过架（用户说了"${a.userComment.substring(0, 30)}..."）`,
            type: 'argument'
        }));

    const angryBargainers = behaviorData.bargains
        .filter(b => !b.exposed && b.ratio < 0.5 && Date.now() - b.time < 7 * 24 * 60 * 60 * 1000)
        .map(b => ({
            name: b.sellerName,
            persona: b.sellerPersona,
            reason: `被用户砍价砍到${Math.round(b.ratio * 100)}%买${b.itemTitle}`,
            type: 'bargain'
        }));

    const allEnemies = [...enemies, ...angryBargainers];

    let enemyPrompt = '';
    if (allEnemies.length > 0) {
        enemyPrompt = `
【仇家信息 - 可能来找茬】
${allEnemies.map(e => `- ${e.name}（性格：${e.persona.temperament}，报复风格：${e.persona.revengeStyle}）：${e.reason}`).join('\n')}
仇家可能会：嘲讽商品/质疑定价/阴阳怪气/故意砍到很低的价格/翻旧账。
`;
    }

    const prompt = `基于世界观"${settings.worldSetting}"，用户刚在二手市场发布了一个商品生成多个人发来的私信咨询。

【商品信息】
标题：${item.title}
价格：¥${item.price}
描述：${item.desc}
卖家：${item.seller}

${enemyPrompt}

【用户的QQ好友（可能感兴趣）】
${friends.map(f => `- ${f.name}（人设：${f.persona?.substring(0, 50) || '普通朋友'}）`).join('\n') || '无'}

【生成要求】
生成 3-6 个不同的人发来的私信每个人发 1-3 条消息。

【私信类型要多样化可以包括但不限于】：
1. **真心买家**：直接问能不能买问细节
2. **砍价者**：试探性出低价可能砍得狠也可能温和
3. **好奇询问**：问东问西但不一定买
4. **仇家找茬**：如果有仇家可能来嘲讽/阴阳怪气/故意恶心人
5. **好友凑热闹**：好友可能来支持/调侃/帮忙砍价/表示想要
6. **竞争卖家**：也在卖类似的东西来刺探价格
7. **中介/代购**：问能不能代为转卖
8. **可疑买家**：问一些奇怪的问题让人感觉不太对劲
9. **急需买家**：很着急想买愿意加价
10. **犹豫买家**：很想买但又在犹豫需要卖家说服

【每个人的说话风格要独特】：
- 有人简短直接："多少出？"
- 有人啰嗦犹豫："那个...我想问一下..."
- 有人很专业："成色几新？有没有发票？"
- 有人很随意："哥们这东西还在吗"
- 有人阴阳怪气（仇家）："哟，这破烂也好意思卖这个价？"

【禁止】
- 禁止使用"路人""买家""用户"等泛称作为名字
- 禁止所有人都是友好的
- 禁止消息内容雷同

返回JSON数组：
[
    {
        "userName": "独特的名字",
        "type": "类型描述（如：真心买家/砍价者/仇家找茬）",
        "messages": ["第一条消息", "第二条消息"],
        "isEnemy": true/false,
        "offeredPrice": 出价金额或null（如果有砍价的话）
    }
]`;

    try {
        const res = await window.API.callAI([{ role: 'user', content: prompt }], apiConfig);
        const responses = window.Utils.safeParseJSON(res);

        if (Array.isArray(responses) && responses.length > 0) {
            const data = this.store.get();
            if (!data.chats) data.chats = [];

            let enemyCount = 0;
            let bargainCount = 0;

            for (const response of responses) {
                if (!response.userName || !response.messages || !Array.isArray(response.messages)) continue;

                // 查找或创建聊天
                let chat = data.chats.find(c => c.userName === response.userName);
                if (!chat) {
                    chat = { userName: response.userName, messages: [] };
                    data.chats.push(chat);
                }

                // 添加消息
                response.messages.forEach(msg => {
                    if (msg && typeof msg === 'string') {
                        chat.messages.push({
                            sender: 'other',
                            content: msg.trim(),
                            time: Date.now()
                        });
                    }
                });

                // 统计
                if (response.isEnemy) enemyCount++;
                if (response.offeredPrice) bargainCount++;

                // 记录砍价行为（如果有）
                if (response.offeredPrice && !isNaN(parseFloat(response.offeredPrice))) {
                    window.BehaviorTracker.recordBargain(
                        response.userName,
                        item.id,
                        item.title,
                        item.price,
                        parseFloat(response.offeredPrice)
                    );
                }
            }

            this.store.set(data);

            // 更新提示
            toast.innerHTML = `<i class="fas fa-envelope"></i> 收到 ${responses.length} 条私信咨询！`;
            setTimeout(() => toast.remove(), 2000);

            // 显示额外提示
            setTimeout(() => {
                let extraHint = '';
                if (enemyCount > 0) {
                    extraHint = `<i class="fas fa-angry"></i> 有 ${enemyCount} 个人来找茬...`;
                } else if (bargainCount > 0) {
                    extraHint = `<i class="fas fa-hand-holding-usd"></i> 有 ${bargainCount} 人想砍价`;
                } else {
                    extraHint = `<i class="fas fa-fire"></i> 商品很受欢迎！`;
                }

                const hint = document.createElement('div');
                hint.style.cssText = 'position:fixed;top:30%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:15px 25px;border-radius:10px;z-index:9999;font-size:14px;text-align:center;';
                hint.innerHTML = extraHint + '<div style="font-size:12px;margin-top:5px;opacity:0.8;">快去私信页面查看吧</div>';
                document.body.appendChild(hint);
                setTimeout(() => hint.remove(), 2500);
            }, 800);

            // 如果有仇家找茬标记已报复
            if (enemyCount > 0) {
                const enemyNames = responses.filter(r => r.isEnemy).map(r => r.userName);
                behaviorData.arguments.forEach(a => {
                    if (enemyNames.includes(a.targetName)) {
                        window.BehaviorTracker.markRevenged(a.id);
                    }
                });
            }

            this.renderChatList();
        } else {
            toast.innerHTML = '<i class="fas fa-exclamation-circle"></i> 暂时没有人咨询';
            setTimeout(() => toast.remove(), 2000);
        }
    } catch (e) {
        console.error('生成私信咨询失败', e);
        toast.innerHTML = '<i class="fas fa-exclamation-circle"></i> 生成咨询失败';
        setTimeout(() => toast.remove(), 2000);
    }
}

}

window.ForumApp = new ForumApp();
