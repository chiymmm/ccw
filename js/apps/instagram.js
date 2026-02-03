class InstagramStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('instagram_data')) {
            const initialData = {
                profile: { name: '我', username: 'me', bio: 'Life is good.', posts: 0, followers: 100, following: 50, avatar: '', pronouns: '', gender: '' },
 posts: [], // {id, userId, username, avatar, image, caption, likes, shares, bookmarks, isBookmarked, time, comments:[], filter: ''}

                stories: [], // {id, userId, username, avatar, image, time}
                dms: [] // {id, participant: {name, username, avatar}, messages: []}
            };
            localStorage.setItem('instagram_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('instagram_data')); }
    set(data) { localStorage.setItem('instagram_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class InstagramApp {
    constructor() {
        this.store = new InstagramStore();
        this.initUI();
    }
async getAvatarUrl(avatar, fallbackName = 'User') {
    // 空值直接返回默认头像
    if (!avatar || avatar === '') {
        return window.Utils.generateDefaultAvatar(fallbackName);
    }

    // 已经是完整的 base64 或 http URL，直接返回
    if (avatar.startsWith('data:') || avatar.startsWith('http')) {
        return avatar;
    }

    // img_ 开头的是 IndexedDB 存储的 ID
    if (avatar.startsWith('img_')) {
        try {
            const url = await window.db.getImage(avatar);
            if (url) return url;
        } catch (e) {
            console.error('Failed to fetch avatar from DB:', e);
        }
        // 获取失败则返回默认头像
        return window.Utils.generateDefaultAvatar(fallbackName);
    }

    // 其他情况尝试从 IndexedDB 获取（兼容旧数据格式）
    try {
        const url = await window.db.getImage(avatar);
        if (url) return url;
    } catch (e) {
        console.error('Failed to fetch avatar from DB:', e);
    }

    return window.Utils.generateDefaultAvatar(fallbackName);
}


    initUI() {
        // Check Phone Check Mode
        if (window.System && window.System.isPhoneCheckMode) {
            if(!document.getElementById('igGenActivityBtn')) {
                const btn = document.createElement('div');
                btn.id = 'igGenActivityBtn';
                btn.className = 'ff-fab';
                btn.style.bottom = '80px';
                btn.style.background = '#e1306c';
                btn.innerHTML = '<i class="fas fa-magic"></i>';
                btn.onclick = () => this.generateActivity();
                document.getElementById('instagramApp').appendChild(btn);
            }
        }

        if(!document.getElementById('igDmWindow')) {
            const dmWin = document.createElement('div');
            dmWin.id = 'igDmWindow';
            dmWin.className = 'sub-page';
            dmWin.style.display = 'none';
            dmWin.style.zIndex = '100';
            dmWin.innerHTML = `
                <div class="sub-header">
                    <button class="back-btn" id="closeIgDm"><i class="fas fa-arrow-left"></i></button>
                    <span class="sub-title" id="igDmTitle">Direct</span>
                    <i class="fas fa-edit" id="igNewDmBtn"></i>
                </div>
                <div id="igDmList" style="flex:1; overflow-y:auto;"></div>
            `;
            document.getElementById('instagramApp').appendChild(dmWin);
            
            document.getElementById('closeIgDm').onclick = () => dmWin.style.display = 'none';
            document.getElementById('igNewDmBtn').onclick = () => this.createNPC();
        }

        if(!document.getElementById('igChatWindow')) {
            const chatWin = document.createElement('div');
            chatWin.id = 'igChatWindow';
            chatWin.className = 'sub-page';
            chatWin.style.display = 'none';
            chatWin.style.zIndex = '101';
            chatWin.innerHTML = `
                <div class="sub-header">
                    <button class="back-btn" id="closeIgChat"><i class="fas fa-arrow-left"></i></button>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div id="igChatAvatar" style="width:30px; height:30px; border-radius:50%; background:#ccc; background-size:cover;"></div>
                        <span class="sub-title" id="igChatTitle">Name</span>
                    </div>
                    <i class="fas fa-magic" id="igGenChatBtn" style="cursor:pointer;"></i>
                </div>
                <div class="chat-messages" id="igChatMessages" style="flex:1; overflow-y:auto; padding:10px;"></div>
                <div class="chat-input-area">
                    <input id="igChatInput" placeholder="Message...">
                    <button class="send-btn" id="igChatSend">Send</button>
                </div>
            `;
            document.getElementById('instagramApp').appendChild(chatWin);
            
            document.getElementById('closeIgChat').onclick = () => chatWin.style.display = 'none';
            document.getElementById('igChatSend').onclick = () => this.sendDM();
            document.getElementById('igGenChatBtn').onclick = () => this.generateDMConversation();
        }

        // Post Detail Modal
        if(!document.getElementById('igPostDetail')) {
            const detail = document.createElement('div');
            detail.id = 'igPostDetail';
            detail.className = 'sub-page';
            detail.style.display = 'none';
            detail.style.zIndex = '60';
            detail.innerHTML = `
                <div class="sub-header">
                    <button class="back-btn" id="closeIgPostDetail"><i class="fas fa-arrow-left"></i></button>
                    <span class="sub-title">Post</span>
                </div>
                <div id="igDetailContent" style="overflow-y:auto; height:calc(100% - 50px);"></div>
            `;
            document.getElementById('instagramApp').appendChild(detail);
            document.getElementById('closeIgPostDetail').onclick = () => detail.style.display = 'none';
        }

document.querySelectorAll('.ig-nav-item').forEach(btn => {
    btn.onclick = () => {
        const tabId = btn.dataset.tab;

        // ig-create 不是真实的 tab 页面单独处理后直接返回
        if(tabId === 'ig-create') {
            this.openCreateModal();
            return;
        }

        document.querySelectorAll('.ig-nav-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.ig-tab-page').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');

        const tabElement = document.getElementById(tabId);
        if(tabElement) {
            tabElement.classList.add('active');
        }

        if(tabId === 'ig-home') this.renderHome();
        if(tabId === 'ig-search') this.renderSearch();
        if(tabId === 'ig-likes') this.renderLikes();
        if(tabId === 'ig-profile') this.renderProfile('me');
    };
});

        const headerActions = document.querySelector('.ig-header-actions');
        if(headerActions) {
            headerActions.innerHTML = `
                <i class="fas fa-plus" id="igHeaderGenBtn"></i>
                <i class="far fa-heart" onclick="document.querySelector('[data-tab=\\'ig-likes\\']').click()"></i>
                <i class="far fa-paper-plane" id="btnOpenIgDm"></i>
            `;
            document.getElementById('igHeaderGenBtn').onclick = () => this.generateFeed();
            document.getElementById('btnOpenIgDm').onclick = () => {
                this.renderDMs();
                document.getElementById('igDmWindow').style.display = 'flex';
            };
        }

        document.getElementById('closeIgCreate').onclick = () => document.getElementById('igCreateModal').style.display = 'none';
        document.getElementById('doIgPost').onclick = () => this.createPost();
        
        document.getElementById('igPhotoOption').onclick = () => document.getElementById('igPhotoInput').click();
        document.getElementById('igPhotoInput').onchange = (e) => this.handlePhotoSelect(e.target.files[0]);
        
        document.getElementById('igTextOption').onclick = () => this.toggleTextMode();

        if(!document.getElementById('igStoryViewer')) {
            const viewer = document.createElement('div');
            viewer.id = 'igStoryViewer';
            viewer.className = 'modal';
            viewer.style.display = 'none';
            viewer.style.background = '#000';
            viewer.innerHTML = `
                <div style="width:100%; height:100%; position:relative; display:flex; flex-direction:column;">
                    <div style="height:4px; background:rgba(255,255,255,0.3); margin:10px; border-radius:2px;">
                        <div id="storyProgress" style="height:100%; width:0%; background:#fff; border-radius:2px; transition:width 0.1s linear;"></div>
                    </div>
                    <div style="padding:0 15px; display:flex; align-items:center; color:#fff;">
                        <div id="storyAvatar" style="width:32px; height:32px; border-radius:50%; background:#ccc; margin-right:10px; background-size:cover;"></div>
                        <span id="storyUser" style="font-weight:bold;">User</span>
                        <i class="fas fa-times" style="margin-left:auto; cursor:pointer;" onclick="document.getElementById('igStoryViewer').style.display='none'"></i>
                    </div>
                    <div id="storyContent" style="flex:1; background-size:contain; background-repeat:no-repeat; background-position:center;"></div>
                </div>
            `;
            document.body.appendChild(viewer);
        }
        
        if(!document.getElementById('igStoryInput')) {
            const input = document.createElement('input');
            input.type = 'file';
            input.id = 'igStoryInput';
            input.hidden = true;
            input.accept = 'image/*';
            input.onchange = (e) => this.uploadStory(e.target.files[0]);
            document.body.appendChild(input);
        }

        this.renderHome();
    }

    async renderHome() {
        const list = document.getElementById('igFeed');
        list.innerHTML = '';
        
        this.renderStories(list);

        const data = this.store.get();
        
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"moments":[], "friends":[]}');
        const friendPosts = [];
        
        for(const m of qqData.moments) {
            if(m.image) {
                friendPosts.push({
                    id: m.id,
                    userId: m.userId,
                    username: m.name,
                    avatar: m.avatar,
                    image: m.image,
                    caption: m.text,
                    likes: m.likes ? m.likes.length : 0,
                    time: m.timestamp,
                    filter: 'none',
                    isFriend: true,
                    comments: []
                });
            }
        }

        const posts = [...data.posts, ...friendPosts].sort((a, b) => b.time - a.time);

        for(const p of posts) {
            const div = await this.createPostElement(p);
            list.appendChild(div);
        }
    }

async createPostElement(p) {
    const div = document.createElement('div');
    div.className = 'ig-post';

    let avatar = p.avatar;
    if (p.userId === 'me') {
        const data = this.store.get();
        avatar = await this.getAvatarUrl(data.profile.avatar, data.profile.name || 'Me');
    } else {
        avatar = await this.getAvatarUrl(p.avatar, p.username);
    }

    let postImg = p.image;
    if(postImg && postImg.startsWith('img_')) postImg = await window.db.getImage(postImg);

    // 检查是否已收藏
    const isBookmarked = p.isBookmarked || false;
    const bookmarkIcon = isBookmarked ? 'fas fa-bookmark' : 'far fa-bookmark';
    const bookmarkStyle = isBookmarked ? 'color:#000;' : '';

    div.innerHTML = `
        <div class="ig-post-header">
            <div class="ig-avatar-small" style="background-image:url('${avatar}')"></div>
            <div class="ig-username">${p.username}</div>
            <i class="fas fa-ellipsis-h" style="cursor:pointer;"></i>
        </div>

<div class="ig-post-img" style="background-image:url('${postImg}'); filter:${p.filter || 'none'};">
    <img src="${postImg}" style="width:100%; height:auto; display:block; visibility:hidden;" onload="this.parentElement.style.minHeight=this.offsetHeight+'px'">
</div>

        <div class="ig-post-actions">
            <div class="ig-action-left">
                <i class="far fa-heart ig-like-btn" style="cursor:pointer;"></i>
                <i class="far fa-comment ig-comment-btn" style="cursor:pointer;"></i>
                <i class="far fa-paper-plane ig-share-btn" style="cursor:pointer;"></i>
            </div>
            <i class="${bookmarkIcon} ig-bookmark-btn" style="cursor:pointer;${bookmarkStyle}"></i>
        </div>
        <div class="ig-likes">${p.likes || 0} likes</div>
        <div class="ig-stats" style="display:flex; gap:15px; padding:0 12px; font-size:12px; color:#8e8e8e;">
            <span><i class="far fa-paper-plane"></i> ${p.shares || 0} shares</span>
            <span><i class="far fa-bookmark"></i> ${p.bookmarks || 0} saves</span>
        </div>
        <div class="ig-caption"><span>${p.username}</span> ${p.caption}</div>
        <div class="ig-view-comments" style="padding:0 12px; color:#8e8e8e; font-size:14px; cursor:pointer;">
            ${p.comments && p.comments.length > 0 ? `查看全部 ${p.comments.length} 条评论` : ''}
        </div>
        <div class="ig-time">${this.timeSince(p.time)} AGO</div>
    `;

    // 图片双击点赞动画
    const imgDiv = div.querySelector('.ig-post-img');
    imgDiv.ondblclick = () => {
        this.likePost(p.id, p.isFriend);
        const heart = document.createElement('i');
        heart.className = 'fas fa-heart';
        heart.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%, -50%) scale(0); color:#fff; font-size:80px; transition:transform 0.2s; pointer-events:none; text-shadow:0 0 10px rgba(0,0,0,0.5);';
        imgDiv.appendChild(heart);
        setTimeout(() => heart.style.transform = 'translate(-50%, -50%) scale(1.2)', 50);
        setTimeout(() => heart.style.transform = 'translate(-50%, -50%) scale(0)', 800);
        setTimeout(() => heart.remove(), 1000);
    };

    imgDiv.onclick = () => this.openPostDetail(p);

    // 点赞按钮
    div.querySelector('.ig-like-btn').onclick = (e) => {
        e.stopPropagation();
        this.likePost(p.id, p.isFriend);
        const btn = e.target;
        btn.className = 'fas fa-heart';
        btn.style.color = '#ed4956';
    };

    // 评论按钮 - 打开详情页
    div.querySelector('.ig-comment-btn').onclick = (e) => {
        e.stopPropagation();
        this.openPostDetail(p);
    };

    // 分享按钮
    div.querySelector('.ig-share-btn').onclick = (e) => {
        e.stopPropagation();
        this.sharePost(p);
    };

    // 书签按钮 - 收藏/取消收藏
    div.querySelector('.ig-bookmark-btn').onclick = (e) => {
        e.stopPropagation();
        this.toggleBookmark(p.id, p.isFriend);
        const btn = e.target;
        if(btn.classList.contains('far')) {
            btn.className = 'fas fa-bookmark ig-bookmark-btn';
            btn.style.color = '#000';
        } else {
            btn.className = 'far fa-bookmark ig-bookmark-btn';
            btn.style.color = '';
        }
    };

    // 查看评论
    div.querySelector('.ig-view-comments').onclick = () => this.openPostDetail(p);

    // 用户名点击
    div.querySelector('.ig-username').onclick = (e) => {
        e.stopPropagation();
        this.renderProfile(p.userId === 'me' ? 'me' : {name: p.username, username: p.username, avatar: p.avatar, bio: 'User'});
    };

    return div;
}


async openPostDetail(p) {
    const detail = document.getElementById('igPostDetail');
    const content = document.getElementById('igDetailContent');
    content.innerHTML = '';

    // 存储当前帖子ID用于回复
    this.currentDetailPostId = p.id;
    this.currentDetailIsFriend = p.isFriend || false;

    const postEl = await this.createPostElement(p);
    content.appendChild(postEl);

    // 评论区
    const commentsDiv = document.createElement('div');
    commentsDiv.style.padding = '10px';
    commentsDiv.innerHTML = '<h4 style="margin-bottom:15px;">评论</h4>';

    if(p.comments && p.comments.length > 0) {
        for(const c of p.comments) {
            const commentEl = await this.createCommentElement(c, p.id);
            commentsDiv.appendChild(commentEl);
        }
    } else {
        commentsDiv.innerHTML += '<div style="color:#999; text-align:center; padding:20px;">暂无评论</div>';
    }

    content.appendChild(commentsDiv);

    // 评论输入框
    const inputArea = document.createElement('div');
    inputArea.style.cssText = 'position:sticky; bottom:0; background:#fff; padding:10px; border-top:1px solid #efefef; display:flex; gap:10px;';
    inputArea.innerHTML = `
        <input id="igCommentInput" placeholder="添加评论..." style="flex:1; border:1px solid #dbdbdb; border-radius:20px; padding:8px 15px; outline:none;">
        <button id="igCommentSend" style="background:#0095f6; color:#fff; border:none; border-radius:20px; padding:8px 20px; cursor:pointer; font-weight:bold;">发布</button>
    `;
    content.appendChild(inputArea);

    document.getElementById('igCommentSend').onclick = () => this.addComment(p.id, p.isFriend);
    document.getElementById('igCommentInput').onkeypress = (e) => {
        if(e.key === 'Enter') this.addComment(p.id, p.isFriend);
    };

    detail.style.display = 'flex';
}

// 创建评论元素
async createCommentElement(c, postId) {
    const div = document.createElement('div');
    div.style.marginBottom = '15px';

    let avatar = await this.getAvatarUrl(c.avatar, c.username);

    div.innerHTML = `
        <div style="display:flex; gap:10px;">
            <div style="width:32px; height:32px; border-radius:50%; background-image:url('${avatar}'); background-size:cover; flex-shrink:0;"></div>
            <div style="flex:1;">
                <div>
                    <span style="font-weight:bold; margin-right:5px;">${c.username}</span>
                    ${c.isFriend ? '<span style="background:#e1306c; color:#fff; font-size:10px; padding:1px 5px; border-radius:3px;">好友</span>' : ''}
                </div>
                <div style="margin:3px 0;">${c.text}</div>
                <div style="display:flex; gap:15px; font-size:12px; color:#8e8e8e;">
                    <span>${this.timeSince(c.time || Date.now())}</span>
                    <span style="cursor:pointer;" class="comment-like-btn"><i class="far fa-heart"></i> ${c.likes || 0}</span>
                    <span style="cursor:pointer;" class="comment-reply-btn">回复</span>
                </div>
            </div>
        </div>
    `;

    // 回复列表
    if(c.replies && c.replies.length > 0) {
        const repliesDiv = document.createElement('div');
        repliesDiv.style.cssText = 'margin-left:42px; margin-top:10px; border-left:2px solid #efefef; padding-left:10px;';

        for(const r of c.replies) {
            let replyAvatar = await this.getAvatarUrl(r.avatar, r.username);
            const replyEl = document.createElement('div');
            replyEl.style.marginBottom = '10px';
            replyEl.innerHTML = `
                <div style="display:flex; gap:8px;">
                    <div style="width:24px; height:24px; border-radius:50%; background-image:url('${replyAvatar}'); background-size:cover;"></div>
                    <div>
                        <span style="font-weight:bold; font-size:13px;">${r.username}</span>
                        <span style="font-size:13px;"> ${r.text}</span>
                    </div>
                </div>
            `;
            repliesDiv.appendChild(replyEl);
        }
        div.appendChild(repliesDiv);
    }

    // 回复按钮事件
    div.querySelector('.comment-reply-btn').onclick = () => {
        const input = document.getElementById('igCommentInput');
        input.value = `@${c.username} `;
        input.focus();
        // 存储回复目标
        this.replyToCommentId = c.id;
    };

    // 评论点赞
    div.querySelector('.comment-like-btn').onclick = (e) => {
        this.likeComment(postId, c.id);
        e.target.innerHTML = `<i class="fas fa-heart" style="color:#ed4956;"></i> ${(c.likes || 0) + 1}`;
    };

    return div;
}

// 添加评论
async addComment(postId, isFriend) {
    const input = document.getElementById('igCommentInput');
    const text = input.value.trim();
    if(!text) return;

    const profile = this.store.get().profile;

    // 检查是否是回复
    if(this.replyToCommentId && text.startsWith('@')) {
        this.addReply(postId, this.replyToCommentId, text, isFriend);
        this.replyToCommentId = null;
    } else {
        // 普通评论
        const newComment = {
            id: window.Utils.generateId('cmt'),
            username: profile.username || 'me',
            avatar: profile.avatar,
            text: text,
            likes: 0,
            time: Date.now(),
            isFriend: false,
            replies: []
        };

        if(isFriend) {
            const qq = JSON.parse(localStorage.getItem('qq_data'));
            const m = qq.moments.find(x => x.id === postId);
            if(m) {
                if(!m.comments) m.comments = [];
                m.comments.push(newComment);
                localStorage.setItem('qq_data', JSON.stringify(qq));
            }
        } else {
            this.store.update(d => {
                const p = d.posts.find(x => x.id === postId);
                if(p) {
                    if(!p.comments) p.comments = [];
                    p.comments.push(newComment);
                }
            });
        }

        // 自动生成互动回复
        await this.generateCommentReply(postId, newComment, isFriend);
    }

    input.value = '';

    // 刷新详情页
    const data = this.store.get();
    const post = data.posts.find(x => x.id === postId);
    if(post) this.openPostDetail(post);
}


// 添加回复
addReply(postId, commentId, text, isFriend) {
    const profile = this.store.get().profile;

    const newReply = {
        id: window.Utils.generateId('rpl'),
        username: profile.username || 'me',
        avatar: profile.avatar,
        text: text,
        likes: 0
    };

    this.store.update(d => {
        const p = d.posts.find(x => x.id === postId);
        if(p && p.comments) {
            const c = p.comments.find(x => x.id === commentId);
            if(c) {
                if(!c.replies) c.replies = [];
                c.replies.push(newReply);
            }
        }
    });
}

// 评论点赞
likeComment(postId, commentId) {
    this.store.update(d => {
        const p = d.posts.find(x => x.id === postId);
        if(p && p.comments) {
            const c = p.comments.find(x => x.id === commentId);
            if(c) c.likes = (c.likes || 0) + 1;
        }
    });
}


    async generateFeed() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const btn = document.getElementById('igHeaderGenBtn');
        const originalClass = btn.className;
        btn.className = 'fas fa-spinner fa-spin';

        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        const friends = qqData.friends.slice(0, 5);
        const friendContext = friends.map(f => `${f.name} (人设:${f.persona})`).join('; ');

        // Inject Global Memory
        const globalContext = window.MemoryManager.getGlobalContext();
        const memoryPrompt = `\n[最近发生的事]:\n${globalContext.recentChats.join('\n')}\n请根据这些近期聊天内容，让好友发布相关的 Ins 帖子。\n`;

        const prompt = `生成 6-9 条 Instagram 风格的帖子。
        ${memoryPrompt}
        要求：
        1. 极度拟人化：使用大量 Emoji、Hashtag、简短感叹、生活化语言。
        2. 包含图片描述。
        3. 角色来源：可以是路人，也可以是以下好友：${friendContext}。
        4. 互动数据：生成真实的点赞数(likes)。
        5. 评论区：每条帖子生成 2-3 条评论。
        6. 返回 JSON 数组：
        [
            {
                "username": "用户名", "caption": "文案 #tag", "imagePrompt": "图片描述", "likes": 123,
                "comments": [{"username": "评论人", "text": "评论内容"}]
            }
        ]`;

 try {
    const res = await window.API.callAI(prompt, apiConfig);
    let posts = [];

    // 多层容错解析 JSON
    const parseJSON = (str) => {
        // 尝试直接解析
        try {
            return JSON.parse(str);
        } catch(e) {}

        // 尝试提取 JSON 数组
        const arrayMatch = str.match(/\[\s*\{[\s\S]*?\}\s*\]/);
        if(arrayMatch) {
            try {
                return JSON.parse(arrayMatch[0]);
            } catch(e) {}
        }

        // 尝试提取 markdown 代码块中的 JSON
        const codeBlockMatch = str.match(/```(?:json)?\s*([\s\S]*?)```/);
        if(codeBlockMatch) {
            try {
                return JSON.parse(codeBlockMatch[1].trim());
            } catch(e) {}
        }

        // 尝试修复常见 JSON 错误（尾随逗号）
        const cleanedStr = str
            .replace(/,\s*}/g, '}')
            .replace(/,\s*\]/g, ']');
        const cleanMatch = cleanedStr.match(/\[\s*\{[\s\S]*?\}\s*\]/);
        if(cleanMatch) {
            try {
                return JSON.parse(cleanMatch[0]);
            } catch(e) {}
        }

        return null;
    };

    posts = parseJSON(res);

    if(Array.isArray(posts) && posts.length > 0) {
        const newPosts = [];
        for(const p of posts) {
            // 跳过格式不正确的帖子
            if(!p.username || !p.caption) continue;

            let imgId = null;
            if(p.imagePrompt && apiConfig.imageApiKey) {
                try {
                    const imgBase64 = await window.API.generateImage(p.imagePrompt, apiConfig);
                    imgId = await window.db.saveImage(imgBase64);
                } catch(e) { console.error('Image gen failed', e); }
            }

            if(!imgId) imgId = await window.db.saveImage(window.Utils.generateDefaultImage(p.caption));

            let avatar = '';
            const friend = friends.find(f => f.name === p.username);
            if(friend) avatar = friend.avatar;

            newPosts.push({
                id: window.Utils.generateId('ig'),
                userId: 'ai_generated',
                username: p.username,
                avatar: avatar,
                image: imgId,
                caption: p.caption,
                likes: p.likes || Math.floor(Math.random() * 1000),
                time: Date.now(),
                comments: p.comments || [],
                filter: 'none'
            });
        }

        if(newPosts.length > 0) {
            this.store.update(d => d.posts.push(...newPosts));
            this.renderHome();
        } else {
            console.warn('No valid posts generated');
        }
    } else {
        console.warn('Failed to parse posts from AI response');
    }
} catch(e) {
    console.error(e);
    alert('生成失败');
}
finally {
            btn.className = originalClass;
        }
    }

    sharePost(post) {
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        if(qqData.friends.length === 0) return alert('暂无好友可分享');
        
        const names = qqData.friends.map((f, i) => `${i+1}. ${f.name}`).join('\n');
        const choice = prompt(`分享给谁？(输入序号)\n${names}`);
        const idx = parseInt(choice) - 1;
        
        if(idx >= 0 && idx < qqData.friends.length) {
            const friend = qqData.friends[idx];
            const msg = `[分享帖子] ${post.username}: ${post.caption}`;
            
            if(!qqData.messages[friend.id]) qqData.messages[friend.id] = [];
            qqData.messages[friend.id].push({
                id: Date.now(), senderId: 'user', senderName: qqData.user.name, content: msg, type: 'text', timestamp: Date.now(), status: 'normal'
            });
            localStorage.setItem('qq_data', JSON.stringify(qqData));
            alert(`已分享给 ${friend.name}`);
        }
    }

    async renderLikes() {
        let likesPage = document.getElementById('ig-likes');
        if(!likesPage) {
            likesPage = document.createElement('div');
            likesPage.id = 'ig-likes';
            likesPage.className = 'ig-tab-page';
            const content = document.querySelector('.ig-content');
            if(content) content.appendChild(likesPage);
        }
        
        likesPage.innerHTML = '<div style="padding:15px; font-weight:bold; border-bottom:1px solid #eee;">Activity</div>';
        
        const activities = [
            { user: 'friend1', action: 'liked your photo', time: '2m' },
            { user: 'friend2', action: 'started following you', time: '1h' },
            { user: 'friend3', action: 'commented: "Nice!"', time: '3h' }
        ];
        
        activities.forEach(a => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:15px; display:flex; align-items:center; border-bottom:1px solid #eee;';
            div.innerHTML = `
                <div style="width:40px; height:40px; background:#ccc; border-radius:50%; margin-right:10px;"></div>
                <div style="font-size:14px;"><span style="font-weight:bold;">${a.user}</span> ${a.action} <span style="color:#999;">${a.time}</span></div>
            `;
            likesPage.appendChild(div);
        });
    }

async renderStories(container) {
    const storiesDiv = document.createElement('div');
    storiesDiv.style.cssText = 'display:flex; gap:15px; padding:15px; overflow-x:auto; border-bottom:1px solid #efefef; scrollbar-width: none; -ms-overflow-style: none;';

    const data = this.store.get();
    const profile = data.profile;

    // 关键修复：正确获取用户头像
    const myAvatar = await this.getAvatarUrl(profile.avatar, profile.name || 'Me');

    const myStory = document.createElement('div');
    myStory.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer;';

    myStory.innerHTML = `
        <div style="width:60px; height:60px; border-radius:50%; background-image:url('${myAvatar}'); background-size:cover; border:2px solid #fff; outline:2px solid #dbdbdb; position:relative;">
            <div style="position:absolute; bottom:-2px; right:-2px; width:20px; height:20px; background:#0095f6; border-radius:50%; border:2px solid #fff; display:flex; justify-content:center; align-items:center; color:#fff; font-size:12px;">+</div>
        </div>
        <span style="font-size:12px;">Your Story</span>
    `;

    myStory.onclick = () => document.getElementById('igStoryInput').click();
    storiesDiv.appendChild(myStory);

    // ... 后续好友 Story 代码保持不变


    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
    for(const f of qqData.friends) {
        let avatar = f.avatar;
        if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);

        const s = document.createElement('div');
        s.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer;';
        s.innerHTML = `
            <div style="width:60px; height:60px; border-radius:50%; background:url('${avatar || window.Utils.generateDefaultAvatar(f.name)}'); background-size:cover; border:2px solid #fff; outline:2px solid #e1306c;"></div>
            <span style="font-size:12px;">${f.name}</span>
        `;
        const storyImg = window.Utils.generateDefaultImage(`Story by ${f.name}`);
        s.onclick = () => this.openStoryViewer(f.name, avatar, storyImg);
        storiesDiv.appendChild(s);
    }

    // 用户自己发布的 Stories
// 用户自己发布的 Stories
const myStories = data.stories || [];
for(const s of myStories) {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer;';

    // 修复：确保头像URL正确获取
    const storyAvatarUrl = await this.getAvatarUrl(profile.avatar, profile.name || 'Me');

    div.innerHTML = `
        <div style="width:60px; height:60px; border-radius:50%; background:url('${storyAvatarUrl}'); background-size:cover; border:2px solid #fff; outline:2px solid #e1306c;"></div>
        <span style="font-size:12px;">Me</span>
    `;

    let img = s.image;
    if(img && img.startsWith('img_')) img = await window.db.getImage(img);

    div.onclick = () => this.openStoryViewer('Me', storyAvatarUrl, img);
    storiesDiv.appendChild(div);
}


    container.appendChild(storiesDiv);
}


    
    async uploadStory(file) {
        if(!file) return;
        const id = await window.db.saveImage(file);
        this.store.update(d => {
            if(!d.stories) d.stories = [];
            d.stories.push({
                id: Date.now(),
                userId: 'me',
                image: id,
                time: Date.now()
            });
        });
        this.renderHome();
        alert('快拍已发布');
    }

    openStoryViewer(user, avatar, image) {
        const viewer = document.getElementById('igStoryViewer');
        document.getElementById('storyUser').innerText = user;
        document.getElementById('storyAvatar').style.backgroundImage = `url('${avatar}')`;
        document.getElementById('storyContent').style.backgroundImage = `url('${image}')`;
        viewer.style.display = 'flex';
        
        const progress = document.getElementById('storyProgress');
        progress.style.width = '0%';
        
        let width = 0;
        const interval = setInterval(() => {
            if(viewer.style.display === 'none') {
                clearInterval(interval);
                return;
            }
            width += 1;
            progress.style.width = width + '%';
            if(width >= 100) {
                clearInterval(interval);
                viewer.style.display = 'none';
            }
        }, 30);
    }

    likePost(postId, isFriend) {
        if(isFriend) {
            const qq = JSON.parse(localStorage.getItem('qq_data'));
            const m = qq.moments.find(x => x.id === postId);
            if(m) {
                if(!m.likes) m.likes = [];
                m.likes.push({userId: 'user', name: qq.user.name});
                localStorage.setItem('qq_data', JSON.stringify(qq));
                this.renderHome();
            }
        } else {
            this.store.update(d => {
                const p = d.posts.find(x => x.id === postId);
                if(p) p.likes++;
            });
            this.renderHome();
        }
    }

    async renderSearch() {
        const apiConfig = window.API.getConfig();
        const grid = document.getElementById('igSearchGrid');
        grid.innerHTML = '<div style="text-align:center;padding:20px;">Loading...</div>';
        
        const renderDefault = () => {
            grid.innerHTML = '';
            const images = Array.from({length: 12}, (_, i) => ({
                url: window.Utils.generateDefaultImage(`Explore ${i+1}`)
            }));
            images.forEach(img => {
                const div = document.createElement('div');
                div.className = 'ig-grid-item';
                div.style.backgroundImage = `url('${img.url}')`;
                grid.appendChild(div);
            });
        };

        if(apiConfig.chatApiKey) {
            const prompt = `生成 9 个 Instagram 探索页面的图片描述。返回 JSON 数组: ["描述1", "描述2"]`;
            try {
                // Add timeout race
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000));
                const apiPromise = window.API.callAI(prompt, apiConfig);
                
                const res = await Promise.race([apiPromise, timeoutPromise]);
                
                let descs = [];
                try {
                    descs = JSON.parse(res);
                } catch(e) {
                    const match = res.match(/\[[\s\S]*\]/);
                    if(match) descs = JSON.parse(match[0]);
                }
                
                if (!Array.isArray(descs) || descs.length === 0) throw new Error('Invalid format');

                grid.innerHTML = '';
                
                descs.forEach(d => {
                    const div = document.createElement('div');
                    div.className = 'ig-grid-item';
                    div.style.backgroundImage = `url('${window.Utils.generateDefaultImage(d)}')`;
                    grid.appendChild(div);
                });
} catch(e) {
    console.error('IG Search Error:', e);
    if(e.message === 'Timeout') {
        console.log('API timeout, using default content');
    }
    renderDefault();
}

        } else {
            renderDefault();
        }
    }


async renderProfile(target) {
    const data = this.store.get();
    let p = {};
    let posts = [];

    if(target === 'me') {
        p = data.profile;
        posts = data.posts.filter(x => x.userId === 'me');
    } else {
        p = target;
        posts = data.posts.filter(x => x.username === target.username);
    }

    // 修复：先完成异步获取再设置 DOM
    const avatarUrl = await this.getAvatarUrl(p.avatar, p.name || p.username);

    const avatarEl = document.getElementById('igProfileAvatar');
    if (avatarEl) {
        avatarEl.style.backgroundImage = `url('${avatarUrl}')`;
    }

    document.getElementById('igProfileName').innerText = p.name || '';
    document.getElementById('igProfileBio').innerText = p.bio || '';
    document.getElementById('igStatPosts').innerText = posts.length;
    document.getElementById('igStatFollowers').innerText = p.followers || 0;
    document.getElementById('igStatFollowing').innerText = p.following || 0;


// 添加收藏按钮（仅自己的Profile显示）
if(target === 'me') {
    let bookmarkBtn = document.getElementById('igProfileBookmarkBtn');
    if(!bookmarkBtn) {
        const profileActions = document.querySelector('.ig-profile-actions');
        if(profileActions) {
            bookmarkBtn = document.createElement('button');
            bookmarkBtn.id = 'igProfileBookmarkBtn';
            bookmarkBtn.className = 'action-btn secondary';
            bookmarkBtn.style.cssText = 'margin-left:10px;';
            bookmarkBtn.innerHTML = '<i class="far fa-bookmark"></i> 收藏';
            bookmarkBtn.onclick = () => this.renderBookmarks();
            profileActions.appendChild(bookmarkBtn);
        }
    }
}

        const grid = document.getElementById('igProfileGrid');
        grid.innerHTML = '';
        
        for(const post of posts.sort((a, b) => b.time - a.time)) {
            let postImg = post.image;
            if(postImg && postImg.startsWith('img_')) postImg = await window.db.getImage(postImg);
            
            const div = document.createElement('div');
            div.className = 'ig-grid-item';
            div.style.backgroundImage = `url('${postImg}')`;
            div.style.filter = post.filter || 'none';
            div.onclick = () => this.openPostDetail(post);
            grid.appendChild(div);
        }

if(target === 'me') {
    document.getElementById('igEditProfileBtn').style.display = 'block';
document.getElementById('igEditProfileBtn').onclick = async () => {
    // 修复：在创建弹窗 HTML 之前先获取头像 URL
    const currentAvatarUrl = await this.getAvatarUrl(p.avatar, p.name || 'Me');

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>编辑资料</h3>
            <div style="display:flex; justify-content:center; margin-bottom:20px;">
                <div id="igEditAvatarPreview" style="width:80px; height:80px; border-radius:50%; background-image:url('${currentAvatarUrl}'); background-size:cover; background-position:center; cursor:pointer; border:2px solid #dbdbdb; position:relative;">
                    <div style="position:absolute; bottom:0; right:0; width:24px; height:24px; background:#0095f6; border-radius:50%; display:flex; justify-content:center; align-items:center; color:#fff; font-size:12px;">
                        <i class="fas fa-camera"></i>
                    </div>
                </div>
                <input type="file" id="igEditAvatarInput" accept="image/*" hidden>
            </div>
            <div class="form-group"><label>名称</label><input id="igEditName" value="${p.name || ''}"></div>
            <div class="form-group"><label>用户名 (ID)</label><input id="igEditUsername" value="${p.username || ''}"></div>
            <div class="form-group"><label>人称代词</label><input id="igEditPronouns" value="${p.pronouns || ''}"></div>
            <div class="form-group"><label>性别</label><input id="igEditGender" value="${p.gender || ''}"></div>
            <div class="form-group"><label>简介</label><textarea id="igEditBio">${p.bio || ''}</textarea></div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="action-btn secondary" onclick="this.closest('.modal').remove()">取消</button>
                <button class="action-btn" id="igSaveProfile">保存</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 后续代码保持不变...


        // 临时存储新头像ID
        let newAvatarId = null;

        // 头像点击上传
        document.getElementById('igEditAvatarPreview').onclick = () => {
            document.getElementById('igEditAvatarInput').click();
        };

        document.getElementById('igEditAvatarInput').onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    // 保存到 IndexedDB
                    newAvatarId = await window.db.saveImage(file);
                    // 获取 URL 并更新预览
                    const newUrl = await window.db.getImage(newAvatarId);
                    document.getElementById('igEditAvatarPreview').style.backgroundImage = `url('${newUrl}')`;
                } catch (err) {
                    console.error('Avatar upload failed:', err);
                    alert('头像上传失败');
                }
            }
        };

document.getElementById('igSaveProfile').onclick = async () => {
    this.store.update(d => {
        d.profile.name = document.getElementById('igEditName').value;
        d.profile.username = document.getElementById('igEditUsername').value;
        d.profile.pronouns = document.getElementById('igEditPronouns').value;
        d.profile.gender = document.getElementById('igEditGender').value;
        d.profile.bio = document.getElementById('igEditBio').value;
        // 如果有新上传的头像则更新
        if (newAvatarId) {
            d.profile.avatar = newAvatarId;
        }
    });
    modal.remove();

    // 修复：确保异步刷新完成
    await this.renderProfile('me');
    await this.renderHome();
};

    };
// 在 renderProfile 函数中找到 Profile 页面头像点击上传的代码块
// 将其替换为以下带调试的版本：

document.getElementById('igProfileAvatar').onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        if(e.target.files[0]) {
            try {
                const id = await window.db.saveImage(e.target.files[0]);
                console.log('保存返回的ID:', id); // 调试：检查ID格式

                this.store.update(d => d.profile.avatar = id);

                const savedData = this.store.get();
                console.log('存储后的avatar值:', savedData.profile.avatar); // 调试：检查是否正确存储

                const retrievedUrl = await window.db.getImage(id);
                console.log('从DB获取的URL:', retrievedUrl ? '有值' : '空值'); // 调试：检查读取结果

                await this.renderProfile('me');
                await this.renderHome();
                alert('头像更换成功！');
            } catch(err) {
                console.error('Avatar save failed', err);
                alert('头像保存失败');
            }
        }
    };
    input.click();
};

} else {
    document.getElementById('igEditProfileBtn').style.display = 'none';
    document.getElementById('igProfileAvatar').onclick = null;
}

    }

    openCreateModal() {
        document.getElementById('igCreateModal').style.display = 'flex';
        this.resetCreateModal();
    }

    resetCreateModal() {
        this.currentImageId = null;
        this.isTextMode = false;
        this.currentFilter = '';
        document.getElementById('igCreatePreview').innerHTML = '<i class="fas fa-image"></i>';
        document.getElementById('igCreatePreview').style.backgroundImage = '';
        document.getElementById('igCreatePreview').style.filter = '';
        document.getElementById('igCreateCaption').value = '';
        
        if(!document.getElementById('igFilters')) {
            const filterContainer = document.createElement('div');
            filterContainer.id = 'igFilters';
            filterContainer.style.cssText = 'display:flex; gap:10px; padding:10px; overflow-x:auto;';
            const filters = ['none', 'grayscale(100%)', 'sepia(50%)', 'contrast(150%)', 'brightness(120%)', 'blur(1px)'];
            filters.forEach(f => {
                const btn = document.createElement('div');
                btn.style.cssText = 'width:50px; height:50px; background:#eee; flex-shrink:0; cursor:pointer; border-radius:4px;';
                btn.style.filter = f;
                btn.onclick = () => {
                    this.currentFilter = f;
                    document.getElementById('igCreatePreview').style.filter = f;
                };
                filterContainer.appendChild(btn);
            });
            const modal = document.getElementById('igCreateModal');
            modal.insertBefore(filterContainer, document.getElementById('igCreateCaption'));
        }
    }

    async handlePhotoSelect(file) {
        if(!file) return;
        this.isTextMode = false;
        const id = await window.db.saveImage(file);
        this.currentImageId = id;
        const url = await window.db.getImage(id);
        document.getElementById('igCreatePreview').style.backgroundImage = `url('${url}')`;
        document.getElementById('igCreatePreview').innerHTML = '';
    }

    toggleTextMode() {
        this.isTextMode = true;
        this.currentImageId = null;
        document.getElementById('igCreatePreview').style.backgroundImage = '';
        document.getElementById('igCreatePreview').innerHTML = `
            <div class="ig-text-mode" contenteditable="true">输入文字...</div>
        `;
    }

async createPost() {
    let caption = document.getElementById('igCreateCaption').value;

    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
    const mentions = caption.match(/@(\S+)/g);
    if(mentions) {
        mentions.forEach(m => {
            const name = m.substring(1);
            const friend = qqData.friends.find(f => f.name === name);
            if(friend) {
                if(!qqData.messages[friend.id]) qqData.messages[friend.id] = [];
                qqData.messages[friend.id].push({
                    id: Date.now(), senderId: 'sys', senderName: 'Instagram',
                    content: `你在 Instagram 上被提及了: "${caption}"`, type: 'text', timestamp: Date.now(), status: 'normal'
                });
                localStorage.setItem('qq_data', JSON.stringify(qqData));
            }
        });
    }

if(this.isTextMode) {
    const textDiv = document.querySelector('.ig-text-mode');
    const text = textDiv.innerText;
    const canvas = document.createElement('canvas');
    canvas.width = 600; canvas.height = 600;
    const ctx = canvas.getContext('2d');

    // 渐变背景
    const grd = ctx.createLinearGradient(0, 0, 600, 600);
    grd.addColorStop(0, "#f09433");
    grd.addColorStop(1, "#bc1888");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 600, 600);

    // 文字设置
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 自动换行绘制函数
    const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
        const lines = [];
        let currentLine = '';

        for(let i = 0; i < text.length; i++) {
            const char = text[i];
            if(char === '\n') {
                lines.push(currentLine);
                currentLine = '';
                continue;
            }
            const testLine = currentLine + char;
            const metrics = context.measureText(testLine);
            if(metrics.width > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = char;
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);
        return lines;
    };

    // 根据文字长度动态调整字号
    let fontSize = 48;
    const maxWidth = 520;
    const padding = 40;

    ctx.font = `bold ${fontSize}px Arial`;
    let lines = wrapText(ctx, text, 300, 300, maxWidth, fontSize * 1.3);

    // 如果行数太多缩小字号
    while(lines.length * fontSize * 1.3 > (600 - padding * 2) && fontSize > 20) {
        fontSize -= 4;
        ctx.font = `bold ${fontSize}px Arial`;
        lines = wrapText(ctx, text, 300, 300, maxWidth, fontSize * 1.3);
    }

    // 计算垂直居中起始位置
    const lineHeight = fontSize * 1.3;
    const totalHeight = lines.length * lineHeight;
    let startY = (600 - totalHeight) / 2 + lineHeight / 2;

    // 绘制每一行
    lines.forEach((line, index) => {
        ctx.fillText(line, 300, startY + index * lineHeight);
    });

    const url = canvas.toDataURL('image/jpeg');
    this.currentImageId = await window.db.saveImage(url);
}


    if(!this.currentImageId) return alert('请先选择图片或输入文字');

    const profile = this.store.get().profile;

    // 新增 shares, bookmarks, isBookmarked 字段
    const newPost = {
        id: window.Utils.generateId('ig'),
        userId: 'me',
        username: profile.username,
        avatar: profile.avatar,
        image: this.currentImageId,
        caption: caption,
        likes: 0,
        shares: 0,
        bookmarks: 0,
        isBookmarked: false,
        time: Date.now(),
        comments: [],
        filter: this.currentFilter || 'none'
    };

    this.store.update(d => d.posts.push(newPost));

    document.getElementById('igCreateModal').style.display = 'none';
    this.renderHome();

    // 发帖后自动生成互动数据
    this.generateInteractions(newPost.id, caption);
}


async generateInteractions(postId, caption) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return;

    // 获取好友列表
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
    const friends = qqData.friends.slice(0, 10);
    const friendNames = friends.map(f => f.name);

    const prompt = `用户发布了 Instagram 帖子: "${caption}"

请生成真实的互动数据：
1. 点赞数 (likes): 50-500之间的随机数
2. 转发数 (shares): 5-50之间的随机数
3. 书签数 (bookmarks): 10-100之间的随机数
4. 评论 (comments): 生成 8-15 条评论

评论要求：
- 其中必须包含这些好友的评论: ${friendNames.join('、')}（每人至少1条）
- 剩余评论来自随机用户（用英文或中文用户名）
- 评论内容要口语化、真实、多样化（包括emoji、简短感叹、提问、调侃等）
- 每条评论可以有0-3条回复

返回 JSON:
{
    "likes": 数字,
    "shares": 数字,
    "bookmarks": 数字,
    "comments": [
        {
            "id": "唯一ID",
            "username": "用户名",
            "text": "评论内容",
            "likes": 点赞数,
            "time": 时间戳,
            "isFriend": 是否是好友(boolean),
            "replies": [
                {"id": "回复ID", "username": "用户名", "text": "回复内容", "likes": 0}
            ]
        }
    ]
}`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);

        // 多层容错解析
        let json = null;
        try {
            json = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\{[\s\S]*\}/);
            if(match) {
                try {
                    json = JSON.parse(match[0]);
                } catch(e2) {}
            }
        }

        if(json) {
            this.store.update(d => {
                const p = d.posts.find(x => x.id === postId);
                if(p) {
                    p.likes = json.likes || Math.floor(Math.random() * 450) + 50;
                    p.shares = json.shares || Math.floor(Math.random() * 45) + 5;
                    p.bookmarks = json.bookmarks || Math.floor(Math.random() * 90) + 10;

                    // 处理评论添加好友头像
                    if(Array.isArray(json.comments)) {
                        p.comments = json.comments.map(c => {
                            const friend = friends.find(f => f.name === c.username);
                            return {
                                id: c.id || window.Utils.generateId('cmt'),
                                username: c.username,
                                avatar: friend ? friend.avatar : '',
                                text: c.text,
                                likes: c.likes || 0,
                                time: c.time || Date.now(),
                                isFriend: !!friend,
                                replies: c.replies || []
                            };
                        });
                    }
                }
            });
            this.renderHome();

            // 通知
            if(Notification.permission === 'granted') {
                const commentCount = json.comments ? json.comments.length : 0;
                new Notification('Instagram', {
                    body: `🎉 你的帖子收到了 ${json.likes} 个赞和 ${commentCount} 条评论！`,
                    icon: '📸'
                });
            }
        }
    } catch(e) {
        console.error('Generate interactions failed:', e);
        // 失败时生成默认数据
        this.store.update(d => {
            const p = d.posts.find(x => x.id === postId);
            if(p) {
                p.likes = Math.floor(Math.random() * 200) + 30;
                p.shares = Math.floor(Math.random() * 20) + 3;
                p.bookmarks = Math.floor(Math.random() * 50) + 5;
            }
        });
        this.renderHome();
    }
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

    async generateActivity() {
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const char = window.System.currentCheckedFriend;
        if(!char) return;

        const btn = document.getElementById('igGenActivityBtn');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n请生成一条你在 Instagram 上的帖子。\n要求：极度拟人化，符合人设，包含图片描述。\n返回 JSON: {"caption": "文案", "imagePrompt": "图片描述"}`;

        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const post = JSON.parse(res);
            
            let imgId = null;
            if(post.imagePrompt && apiConfig.imageApiKey) {
                try {
                    const imgBase64 = await window.API.generateImage(post.imagePrompt, apiConfig);
                    imgId = await window.db.saveImage(imgBase64);
                } catch(e) { console.error('Image gen failed', e); }
            }
            
            if(!imgId) imgId = await window.db.saveImage(window.Utils.generateDefaultImage(post.caption));

            this.store.update(d => {
                d.posts.push({
                    id: window.Utils.generateId('ig'),
                    userId: 'me', 
                    username: char.name, 
                    avatar: char.avatar,
                    image: imgId,
                    caption: post.caption,
                    likes: 0,
                    time: Date.now(),
                    comments: [],
                    filter: 'none'
                });
            });
            
            this.renderHome();
            alert('已发布新帖子');
            
            if(Math.random() > 0.5) {
                if(Notification.permission === 'granted') {
                    new Notification(char.name, { body: '发布了一条新 Ins' });
                }
            }

        } catch(e) {
            console.error(e);
            alert('生成失败');
        } finally {
            btn.innerHTML = '<i class="fas fa-magic"></i>';
        }
    }

    renderDMs() {
        const list = document.getElementById('igDmList');
        list.innerHTML = '';
        const data = this.store.get();
        
        const genBtn = document.createElement('div');
        genBtn.style.cssText = 'padding:10px; text-align:center; color:#0095f6; font-weight:bold; cursor:pointer; border-bottom:1px solid #dbdbdb;';
        genBtn.innerHTML = '<i class="fas fa-magic"></i> 生成新私信';
        genBtn.onclick = () => this.generateNewDM();
        list.appendChild(genBtn);

        if(!data.dms || data.dms.length === 0) {
            list.innerHTML += '<div style="text-align:center;padding:20px;color:#999;">No messages</div>';
            return;
        }

        data.dms.forEach(dm => {
            const div = document.createElement('div');
            div.className = 't-dm-item'; 
            
            let avatar = dm.participant.avatar;
            window.db.getImage(avatar).then(url => {
                div.innerHTML = `
                    <div class="t-dm-avatar" style="background-image:url('${url || window.Utils.generateDefaultAvatar(dm.participant.name)}')"></div>
                    <div class="t-dm-content">
                        <div class="t-dm-top">
                            <span class="t-dm-name">${dm.participant.name}</span>
                        </div>
                        <div class="t-dm-msg">${dm.messages[dm.messages.length-1]?.text || 'Start chatting'}</div>
                    </div>
                `;
            });
            
            div.onclick = () => this.openDMWindow(dm.id);
            list.appendChild(div);
        });
    }

    createNPC() {
        const name = prompt('Name:');
        const username = prompt('Username:');
        if(name && username) {
            const id = window.Utils.generateId('dm');
            this.store.update(d => {
                if(!d.dms) d.dms = [];
                d.dms.push({
                    id,
                    participant: { name, username, avatar: '' },
                    messages: []
                });
            });
            this.renderDMs();
        }
    }

    openDMWindow(dmId) {
        const data = this.store.get();
        const dm = data.dms.find(d => d.id === dmId);
        if(!dm) return;

        this.currentDmId = dmId;
        const win = document.getElementById('igChatWindow');
        document.getElementById('igChatTitle').innerText = dm.participant.name;
        
        window.db.getImage(dm.participant.avatar).then(url => {
            document.getElementById('igChatAvatar').style.backgroundImage = `url('${url || window.Utils.generateDefaultAvatar(dm.participant.name)}')`;
        });
        
        this.renderDMMessages();
        win.style.display = 'flex';
    }

    renderDMMessages() {
        const data = this.store.get();
        const dm = data.dms.find(d => d.id === this.currentDmId);
        const list = document.getElementById('igChatMessages');
        list.innerHTML = '';
        
        dm.messages.forEach(m => {
            const div = document.createElement('div');
            div.className = `message-row ${m.sender === 'me' ? 'self' : ''}`;
            div.innerHTML = `<div class="msg-content"><div class="msg-bubble">${m.text}</div></div>`;
            list.appendChild(div);
        });
        list.scrollTop = list.scrollHeight;
    }

    sendDM() {
        const input = document.getElementById('igChatInput');
        const text = input.value.trim();
        if(!text) return;
        
        this.store.update(d => {
            const dm = d.dms.find(x => x.id === this.currentDmId);
            dm.messages.push({ sender: 'me', text, time: Date.now() });
        });
        input.value = '';
        this.renderDMMessages();
    }

    async generateDMConversation() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

        const data = this.store.get();
        const dm = data.dms.find(d => d.id === this.currentDmId);
        
        const prompt = `你扮演 ${dm.participant.name} (@${dm.participant.username})。\n请生成一段你和用户的私信对话。\n要求：口语化、真实、符合人设。\n返回 JSON 数组: [{"sender": "them", "text": "内容"}, {"sender": "me", "text": "内容"}]`;
        
        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const msgs = JSON.parse(res);
            if(Array.isArray(msgs)) {
                this.store.update(d => {
                    const target = d.dms.find(x => x.id === this.currentDmId);
                    msgs.forEach(m => target.messages.push({ ...m, time: Date.now() }));
                });
                this.renderDMMessages();
            }
        } catch(e) { console.error(e); }
    }

    async generateNewDM() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        const prompt = `生成一个 Instagram 私信对话的开头。\n返回 JSON: {"name": "用户名", "username": "id", "message": "第一条消息"}`;
        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const json = JSON.parse(res);
            
            const id = window.Utils.generateId('dm');
            this.store.update(d => {
                if(!d.dms) d.dms = [];
                d.dms.push({
                    id: id,
                    participant: { name: json.name, username: json.username, avatar: '' },
                    messages: [{sender: 'them', text: json.message, time: Date.now()}]
                });
            });
            this.renderDMMessages();
            this.openDMWindow(id);
        } catch(e) { alert('生成失败'); }
    }
    // 切换书签状态
toggleBookmark(postId, isFriend) {
    if(isFriend) {
        // QQ好友的帖子
        const qq = JSON.parse(localStorage.getItem('qq_data'));
        const m = qq.moments.find(x => x.id === postId);
        if(m) {
            m.isBookmarked = !m.isBookmarked;
            if(m.isBookmarked) {
                m.bookmarks = (m.bookmarks || 0) + 1;
            }
            localStorage.setItem('qq_data', JSON.stringify(qq));
        }
    } else {
        this.store.update(d => {
            const p = d.posts.find(x => x.id === postId);
            if(p) {
                p.isBookmarked = !p.isBookmarked;
                if(p.isBookmarked) {
                    p.bookmarks = (p.bookmarks || 0) + 1;
                }
            }
        });
    }
}

// 渲染收藏页面
async renderBookmarks() {
    let bookmarksPage = document.getElementById('igBookmarksPage');

    if(!bookmarksPage) {
        bookmarksPage = document.createElement('div');
        bookmarksPage.id = 'igBookmarksPage';
        bookmarksPage.className = 'sub-page';
        bookmarksPage.style.display = 'none';
        bookmarksPage.style.zIndex = '102';
        bookmarksPage.innerHTML = `
            <div class="sub-header">
                <button class="back-btn" id="closeIgBookmarks"><i class="fas fa-arrow-left"></i></button>
                <span class="sub-title">收藏</span>
                <div></div>
            </div>
            <div id="igBookmarksGrid" style="display:grid; grid-template-columns:repeat(3,1fr); gap:2px; padding:2px; overflow-y:auto; flex:1;"></div>
        `;
        document.getElementById('instagramApp').appendChild(bookmarksPage);

        document.getElementById('closeIgBookmarks').onclick = () => {
            bookmarksPage.style.display = 'none';
        };
    }

    const grid = document.getElementById('igBookmarksGrid');
    grid.innerHTML = '';

    const data = this.store.get();
    const bookmarkedPosts = data.posts.filter(p => p.isBookmarked);

    // 也获取QQ好友帖子中收藏的
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"moments":[]}');
    const bookmarkedMoments = qqData.moments.filter(m => m.isBookmarked && m.image);

    const allBookmarked = [
        ...bookmarkedPosts.map(p => ({...p, source: 'ig'})),
        ...bookmarkedMoments.map(m => ({
            id: m.id,
            image: m.image,
            caption: m.text,
            username: m.name,
            source: 'qq'
        }))
    ];

    if(allBookmarked.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#999;">暂无收藏</div>';
        return;
    }

    for(const post of allBookmarked) {
        let postImg = post.image;
        if(postImg && postImg.startsWith('img_')) {
            postImg = await window.db.getImage(postImg);
        }

        const div = document.createElement('div');
        div.className = 'ig-grid-item';
        div.style.backgroundImage = `url('${postImg}')`;
        div.style.aspectRatio = '1';
        div.style.cursor = 'pointer';

        div.onclick = () => this.openPostDetail(post);
        grid.appendChild(div);
    }

    bookmarksPage.style.display = 'flex';
}
// 自动生成评论互动回复
async generateCommentReply(postId, userComment, isFriend) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return;

    // 获取帖子信息
    const data = this.store.get();
    const post = data.posts.find(x => x.id === postId);
    if(!post) return;

    // 获取好友列表
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
    const friends = qqData.friends.slice(0, 5);
    const friendNames = friends.map(f => `${f.name}(人设:${f.persona || '普通朋友'})`).join('、');

    const prompt = `Instagram帖子场景：
帖子内容: "${post.caption}"
用户刚发表评论: "${userComment.text}"

请生成其他人对这条评论的互动回复要求：
1. 生成 1-7 条回复（随机数量）
2. 回复者可以是：帖主本人(${post.username})、好友(${friendNames})、或随机路人
3. 回复要自然口语化可以包含emoji
4. 回复类型多样：赞同、调侃、接话、表情包式回复等
5. 有30%概率帖主亲自回复

返回JSON数组:
[
    {
        "username": "回复者用户名",
        "text": "回复内容",
        "isPostOwner": 是否是帖主(boolean)
    }
]`;

    try {
        // 延迟1-3秒模拟真实场景
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        const res = await window.API.callAI(prompt, apiConfig);

        let replies = [];
        try {
            replies = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\[[\s\S]*\]/);
            if(match) replies = JSON.parse(match[0]);
        }

        if(Array.isArray(replies) && replies.length > 0) {
            this.store.update(d => {
                const p = d.posts.find(x => x.id === postId);
                if(p && p.comments) {
                    const comment = p.comments.find(c => c.id === userComment.id);
                    if(comment) {
                        if(!comment.replies) comment.replies = [];

                        replies.forEach(r => {
                            // 查找好友头像
                            const friend = friends.find(f => f.name === r.username);

                            comment.replies.push({
                                id: window.Utils.generateId('rpl'),
                                username: r.username,
                                avatar: friend ? friend.avatar : (r.isPostOwner ? post.avatar : ''),
                                text: r.text,
                                likes: Math.floor(Math.random() * 10)
                            });
                        });

                        // 评论点赞数也随机增加
                        comment.likes = (comment.likes || 0) + Math.floor(Math.random() * 5) + 1;
                    }
                }
            });

            // 刷新详情页显示新回复
            const updatedData = this.store.get();
            const updatedPost = updatedData.posts.find(x => x.id === postId);
            if(updatedPost && document.getElementById('igPostDetail').style.display !== 'none') {
                this.openPostDetail(updatedPost);
            }

            // 通知
            if(Notification.permission === 'granted' && replies.length > 0) {
                new Notification('Instagram', {
                    body: `💬 ${replies[0].username} 回复了你的评论`,
                    icon: '📸'
                });
            }
        }
    } catch(e) {
        console.error('Generate comment reply failed:', e);
    }
}

}

window.InstagramApp = new InstagramApp();
