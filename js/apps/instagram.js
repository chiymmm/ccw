// ==================== 在 InstagramStore 类中新增 NPC 管理方法 ====================

class InstagramStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('instagram_data')) {
            const initialData = {
                profile: { name: '我', username: 'me', bio: 'Life is good.', posts: 0, followers: 100, following: 50, avatar: '', pronouns: '', gender: '' },
                posts: [],
                stories: [],
                dms: [],
                npcUsers: {}, // 新增：NPC用户缓存 {username: {profile, posts, reposts, lastUpdated}}
                dmSettings: {} // 新增：每个DM的设置 {dmId: {autoReply: false}}
                                ,bindAccount: null, // 新增：绑定的账号信息
                lastActiveTime: Date.now(), // 新增：最后活跃时间
                followerHistory: [], // 新增：粉丝变化历史 [{time, count, reason}]
                totalLikes: 0, // 新增：累计获赞
                totalComments: 0, // 新增：累计评论
                viralPosts: [] // 新增：爆款帖子记录


            };
            localStorage.setItem('instagram_data', JSON.stringify(initialData));
        } else {
            // 兼容旧数据
this.update(d => {
    if(!d.npcUsers) d.npcUsers = {};
    if(!d.dmSettings) d.dmSettings = {}; // 新增
                        if(!d.profile.lastActiveTime) d.profile.lastActiveTime = Date.now();
                    if(!d.profile.followerHistory) d.profile.followerHistory = [];
                    if(!d.profile.totalLikes) d.profile.totalLikes = 0;
                    if(!d.profile.totalComments) d.profile.totalComments = 0;
                    if(!d.profile.viralPosts) d.profile.viralPosts = [];

});

        }
    }
    get() { return JSON.parse(localStorage.getItem('instagram_data')); }
    set(data) { localStorage.setItem('instagram_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }

    // 新增：获取或创建NPC用户
    getNpcUser(username) {
        const data = this.get();
        return data.npcUsers[username] || null;
    }

    // 新增：保存NPC用户（自动清理超过8个的旧数据）
    saveNpcUser(username, npcData) {
        this.update(d => {
            // 清理超过8个的旧数据
            const usernames = Object.keys(d.npcUsers);
            if(usernames.length >= 8 && !d.npcUsers[username]) {
                // 按最后更新时间排序删除最旧的
                const sorted = usernames.sort((a, b) =>
                    (d.npcUsers[a].lastUpdated || 0) - (d.npcUsers[b].lastUpdated || 0)
                );
                delete d.npcUsers[sorted[0]];
            }
            d.npcUsers[username] = {
                ...npcData,
                lastUpdated: Date.now()
            };
        });
    }

    // 新增：更新NPC用户的帖子
    updateNpcPosts(username, newPosts) {
        this.update(d => {
            if(d.npcUsers[username]) {
                d.npcUsers[username].posts = newPosts;
                d.npcUsers[username].lastUpdated = Date.now();
            }
        });
    }
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
        <div style="display:flex; align-items:center; gap:10px; flex:1;">
            <div id="igChatAvatar" style="width:32px; height:32px; border-radius:50%; background-size:cover; background-position:center;"></div>
            <span class="sub-title" id="igChatTitle">Chat</span>
        </div>
        <i class="fas fa-cog" id="igChatSettingsBtn" style="cursor:pointer; padding:5px;"></i>
    </div>
    <div id="igChatMessages" style="flex:1; overflow-y:auto; padding:10px;"></div>
    <div class="chat-input-area" style="display:flex; flex-direction:row; flex-wrap:nowrap; gap:8px; padding:10px; border-top:1px solid #efefef; align-items:center; background:#fafafa;">
        <input id="igChatInput" placeholder="Message..." style="flex:1; min-width:0; border:1px solid #dbdbdb; border-radius:22px; padding:10px 15px; outline:none; font-size:14px; background:#fff;">
        <button class="send-btn" id="igChatSend" style="background:#0095f6; color:#fff; border:none; border-radius:50%; width:36px; height:36px; min-width:36px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <i class="fas fa-paper-plane" style="font-size:14px;"></i>
        </button>
        <button id="igGenReplyBtn" style="background:#e1306c; color:#fff; border:none; border-radius:50%; width:36px; height:36px; min-width:36px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0;" title="生成回复">
            <i class="fas fa-magic" style="font-size:14px;"></i>
        </button>
    </div>
`;


    document.getElementById('instagramApp').appendChild(chatWin);

    document.getElementById('closeIgChat').onclick = () => chatWin.style.display = 'none';
    document.getElementById('igChatSend').onclick = () => this.sendDM();
    document.getElementById('igChatInput').onkeypress = (e) => {
        if(e.key === 'Enter') this.sendDM();
    };
    document.getElementById('igGenReplyBtn').onclick = () => this.generateDMReply();
    document.getElementById('igChatSettingsBtn').onclick = () => this.openDMSettings();
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
        <i class="fas fa-trash-alt" id="igClearAllBtn" title="清除所有数据" style="color:#ed4956; cursor:pointer;"></i>
        <i class="fas fa-plus" id="igHeaderGenBtn"></i>


                <i class="far fa-heart" onclick="document.querySelector('[data-tab=\\'ig-likes\\']').click()"></i>
                <i class="far fa-paper-plane" id="btnOpenIgDm"></i>
            `;
            document.getElementById('igHeaderGenBtn').onclick = () => this.generateFeed();
            document.getElementById('igClearAllBtn').onclick = () => this.clearAllData();

            document.getElementById('btnOpenIgDm').onclick = () => {
                this.renderDMs();
                document.getElementById('igDmWindow').style.display = 'flex';
            };
        }

const closeIgCreate = document.getElementById('closeIgCreate');
if(closeIgCreate) closeIgCreate.onclick = () => document.getElementById('igCreateModal').style.display = 'none';

const doIgPost = document.getElementById('doIgPost');
if(doIgPost) doIgPost.onclick = () => this.createPost();

const igPhotoOption = document.getElementById('igPhotoOption');
if(igPhotoOption) igPhotoOption.onclick = () => document.getElementById('igPhotoInput').click();

const igPhotoInput = document.getElementById('igPhotoInput');
if(igPhotoInput) igPhotoInput.onchange = (e) => this.handlePhotoSelect(e.target.files[0]);

const igTextOption = document.getElementById('igTextOption');
if(igTextOption) igTextOption.onclick = () => this.toggleTextMode();

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
// ==================== 在 InstagramApp 类中新增用户主页系统 ====================

// 在 initUI() 方法末尾添加用户主页弹窗

    // ... 保留原有代码 ...

    // 新增：用户主页弹窗
    if(!document.getElementById('igUserProfile')) {
        const userProfile = document.createElement('div');
        userProfile.id = 'igUserProfile';
        userProfile.className = 'sub-page';
        userProfile.style.display = 'none';
        userProfile.style.zIndex = '103';
        userProfile.innerHTML = `
            <div class="sub-header">
                <button class="back-btn" id="closeIgUserProfile"><i class="fas fa-arrow-left"></i></button>
                <span class="sub-title" id="igUserProfileTitle">用户</span>
                <div style="width:24px;"></div>
            </div>
            <div id="igUserProfileContent" style="flex:1; overflow-y:auto;">
                <div id="igUserProfileLoading" style="display:flex; justify-content:center; align-items:center; height:200px;">
                    <i class="fas fa-spinner fa-spin" style="font-size:24px; color:#e1306c;"></i>
                    <span style="margin-left:10px;">正在加载用户资料...</span>
                </div>
                <div id="igUserProfileData" style="display:none;">
                    <div style="padding:20px; display:flex; align-items:center; gap:20px;">
                        <div id="igUserAvatar" style="width:80px; height:80px; border-radius:50%; background-size:cover; background-position:center; flex-shrink:0;"></div>
                        <div style="flex:1;">
                            <div style="display:flex; justify-content:space-around; text-align:center; margin-bottom:15px;">
                                <div><div id="igUserPosts" style="font-weight:bold;">0</div><div style="font-size:12px; color:#999;">帖子</div></div>
                                <div><div id="igUserFollowers" style="font-weight:bold;">0</div><div style="font-size:12px; color:#999;">粉丝</div></div>
                                <div><div id="igUserFollowing" style="font-weight:bold;">0</div><div style="font-size:12px; color:#999;">关注</div></div>
                            </div>
                        </div>
                    </div>
                    <div style="padding:0 20px 15px;">
                        <div id="igUserName" style="font-weight:bold;"></div>
                        <div id="igUserBio" style="font-size:14px; color:#666; margin-top:5px;"></div>
                    </div>
                    <div style="display:flex; gap:10px; padding:0 20px 15px;">
                        <button id="igUserFollowBtn" class="action-btn" style="flex:1;">关注</button>
                        <button id="igUserMessageBtn" class="action-btn secondary" style="flex:1;">发消息</button>
                    </div>
                    <div style="display:flex; border-top:1px solid #efefef; border-bottom:1px solid #efefef;">
                        <div id="igUserTabPosts" class="ig-user-tab active" style="flex:1; text-align:center; padding:15px; cursor:pointer; border-bottom:2px solid #262626;">
                            <i class="fas fa-th"></i> 帖子
                        </div>
                        <div id="igUserTabReposts" class="ig-user-tab" style="flex:1; text-align:center; padding:15px; cursor:pointer; color:#999;">
                            <i class="fas fa-retweet"></i> 转发
                        </div>
                    </div>
                    <div id="igUserPostsGrid" style="display:grid; grid-template-columns:repeat(3,1fr); gap:2px;"></div>
                    <div id="igUserRepostsGrid" style="display:none; padding:10px;"></div>
                </div>
            </div>
        `;
        document.getElementById('instagramApp').appendChild(userProfile);

        document.getElementById('closeIgUserProfile').onclick = () => {
            userProfile.style.display = 'none';
        };

        // Tab切换
        document.getElementById('igUserTabPosts').onclick = () => {
            document.getElementById('igUserTabPosts').style.borderBottom = '2px solid #262626';
            document.getElementById('igUserTabPosts').style.color = '#262626';
            document.getElementById('igUserTabReposts').style.borderBottom = 'none';
            document.getElementById('igUserTabReposts').style.color = '#999';
            document.getElementById('igUserPostsGrid').style.display = 'grid';
            document.getElementById('igUserRepostsGrid').style.display = 'none';
        };

        document.getElementById('igUserTabReposts').onclick = () => {
            document.getElementById('igUserTabReposts').style.borderBottom = '2px solid #262626';
            document.getElementById('igUserTabReposts').style.color = '#262626';
            document.getElementById('igUserTabPosts').style.borderBottom = 'none';
            document.getElementById('igUserTabPosts').style.color = '#999';
            document.getElementById('igUserPostsGrid').style.display = 'none';
            document.getElementById('igUserRepostsGrid').style.display = 'block';
        };
    }

    // 新增：转发原帖详情弹窗
    if(!document.getElementById('igRepostDetail')) {
        const repostDetail = document.createElement('div');
        repostDetail.id = 'igRepostDetail';
        repostDetail.className = 'sub-page';
        repostDetail.style.display = 'none';
        repostDetail.style.zIndex = '104';
        repostDetail.innerHTML = `
            <div class="sub-header">
                <button class="back-btn" id="closeIgRepostDetail"><i class="fas fa-arrow-left"></i></button>
                <span class="sub-title">转发详情</span>
                <div style="width:24px;"></div>
            </div>
            <div id="igRepostDetailContent" style="flex:1; overflow-y:auto; padding:10px;"></div>
        `;
        document.getElementById('instagramApp').appendChild(repostDetail);

        document.getElementById('closeIgRepostDetail').onclick = () => {
            repostDetail.style.display = 'none';
        };
    }


    this.renderHome();
}



    async renderHome() {
                // 检查不活跃掉粉
        this.checkInactivityLoss();

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
                // 触发随机互动
        this.triggerRandomInteraction();

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


<div class="ig-caption">
    <span>${p.username}</span> ${(() => {
        const hasChinese = /[\u4e00-\u9fa5]/.test(p.caption);
        if(p.captionZh && p.caption !== p.captionZh && !hasChinese) {
            // 原文非中文显示中文翻译
            return `${p.captionZh}
                <div style="margin-top:6px; font-size:12px; color:#888; font-style:italic;">
                    原文: ${p.caption}
                </div>
            `;
        } else {
            // 原文是中文或没有翻译
            return p.caption;
        }
    })()}
</div>


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



// 用户名点击 - 修改为
div.querySelector('.ig-username').onclick = (e) => {
    e.stopPropagation();
    if(p.userId === 'me') {
        document.querySelector('[data-tab="ig-profile"]').click();
    } else {
        this.openUserProfile({
            username: p.username,
            name: p.username,
            avatar: p.avatar
        });
    }
};

// 头像点击 - 新增
div.querySelector('.ig-avatar-small').onclick = (e) => {
    e.stopPropagation();
    if(p.userId === 'me') {
        document.querySelector('[data-tab="ig-profile"]').click();
    } else {
        this.openUserProfile({
            username: p.username,
            name: p.username,
            avatar: p.avatar
        });
    }
};
div.querySelector('.ig-avatar-small').style.cursor = 'pointer';


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

// ==================== 修改：createCommentElement 添加评论者点击事件 ====================

// 在 createCommentElement 方法中修改评论者头像和用户名的点击事件
// 找到 div.innerHTML 部分将头像和用户名添加点击事件：

async createCommentElement(c, postId) {
    const div = document.createElement('div');
    div.style.marginBottom = '15px';

    let avatar = await this.getAvatarUrl(c.avatar, c.username);

    div.innerHTML = `
        <div style="display:flex; gap:10px;">
            <div class="comment-avatar" style="width:32px; height:32px; border-radius:50%; background-image:url('${avatar}'); background-size:cover; flex-shrink:0; cursor:pointer;"></div>
            <div style="flex:1;">
                <div>
                    <span class="comment-username" style="font-weight:bold; margin-right:5px; cursor:pointer;">${c.username}</span>
                    ${c.isFriend ? '<span style="background:#e1306c; color:#fff; font-size:10px; padding:1px 5px; border-radius:3px;">好友</span>' : ''}
                </div>
                <div style="margin:3px 0;">${(() => {
    const hasChinese = /[\u4e00-\u9fa5]/.test(c.text);
    if(c.textZh && c.text !== c.textZh && !hasChinese) {
        return `${c.textZh}<div style="margin-top:4px; font-size:11px; color:#888; font-style:italic;">原文: ${c.text}</div>`;
    }
    return c.text;
})()}</div>

                <div style="display:flex; gap:15px; font-size:12px; color:#8e8e8e;">
                    <span>${this.timeSince(c.time || Date.now())}</span>
                    <span style="cursor:pointer;" class="comment-like-btn"><i class="far fa-heart"></i> ${c.likes || 0}</span>
                    <span style="cursor:pointer;" class="comment-reply-btn">回复</span>
                </div>
            </div>
        </div>
    `;

    // 评论者头像点击
    div.querySelector('.comment-avatar').onclick = () => {
        this.openUserProfile({
            username: c.username,
            name: c.username,
            avatar: c.avatar
        });
    };

    // 评论者用户名点击
    div.querySelector('.comment-username').onclick = () => {
        this.openUserProfile({
            username: c.username,
            name: c.username,
            avatar: c.avatar
        });
    };

    // 回复列表（保持原有代码）
    if(c.replies && c.replies.length > 0) {
        const repliesDiv = document.createElement('div');
        repliesDiv.style.cssText = 'margin-left:42px; margin-top:10px; border-left:2px solid #efefef; padding-left:10px;';

        for(const r of c.replies) {
            let replyAvatar = await this.getAvatarUrl(r.avatar, r.username);
            const replyEl = document.createElement('div');
            replyEl.style.marginBottom = '10px';
            replyEl.innerHTML = `
                <div style="display:flex; gap:8px;">
                    <div class="reply-avatar" style="width:24px; height:24px; border-radius:50%; background-image:url('${replyAvatar}'); background-size:cover; cursor:pointer;"></div>
                    <div>
                        <span class="reply-username" style="font-weight:bold; font-size:13px; cursor:pointer;">${r.username}</span>
                        <span style="font-size:13px;"> ${(() => {
    const hasChinese = /[\u4e00-\u9fa5]/.test(r.text);
    if(r.textZh && r.text !== r.textZh && !hasChinese) {
        return `${r.textZh} <span style="font-size:10px; color:#999; font-style:italic;">(${r.text})</span>`;
    }
    return r.text;
})()}</span>

                    </div>
                </div>
            `;

            // 回复者头像点击
            replyEl.querySelector('.reply-avatar').onclick = () => {
                this.openUserProfile({ username: r.username, name: r.username, avatar: r.avatar });
            };
            // 回复者用户名点击
            replyEl.querySelector('.reply-username').onclick = () => {
                this.openUserProfile({ username: r.username, name: r.username, avatar: r.avatar });
            };

            repliesDiv.appendChild(replyEl);
        }
        div.appendChild(repliesDiv);
    }

    // 回复按钮事件
    div.querySelector('.comment-reply-btn').onclick = () => {
        const input = document.getElementById('igCommentInput');
        input.value = `@${c.username} `;
        input.focus();
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
        3. 角色来源：可以是路人也可以是以下好友：${friendContext}。
        4. 互动数据：生成真实的点赞数(likes)。
        5. 评论区：每条帖子生成 2-3 条评论。

        【重要-多语言处理】：
        - 文案可以使用英语/日语/韩语/法语等增加真实感
        - 非中文内容必须同时提供中文翻译
        - 原文用 text/caption 字段翻译用 textZh/captionZh 字段

        【重要-用户名规范】：
        - 所有用户名必须独特有个性禁止使用：路人甲、路人乙、用户A、random_user、user1、评论者1等敷衍命名
        - 正确示例：sunny_mood、tokyo_夜猫子、latte_lover、旅行的鱼、vintage_sam

        6. 返回 JSON 数组：
        [
            {
                "username": "用户名",
                "caption": "文案 #tag",
                "captionZh": "文案中文翻译（如果caption是中文则相同）",
                "imagePrompt": "图片描述",
                "likes": 123,
                "comments": [
                    {
                        "username": "独特的评论者用户名",
                        "text": "评论内容",
                        "textZh": "评论中文翻译"
                    }
                ]
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

if(!imgId) imgId = await window.db.saveImage(window.Utils.generateDefaultImage(p.captionZh || p.caption));


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
                    captionZh: p.captionZh || p.caption,
                    likes: p.likes || Math.floor(Math.random() * 1000),
                    time: Date.now(),
                    comments: (p.comments || []).map(c => ({
                        id: window.Utils.generateId('cmt'),
                        username: c.username,
                        text: c.text,
                        textZh: c.textZh || c.text,
                        avatar: '',
                        likes: Math.floor(Math.random() * 50),
                        time: Date.now()
                    })),
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
    url: window.Utils.generateDefaultImage(`探索 ${i+1}`)
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
    // 修复：同时匹配 userId 为 'me' 或 username 与当前用户名相同
    posts = data.posts.filter(x =>
        x.userId === 'me' ||
        x.username === p.username ||
        x.username === 'me'
    );
}
else {
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


// 添加收藏按钮和清除按钮（仅自己的Profile显示）
if(target === 'me') {
    const profileActions = document.querySelector('.ig-profile-actions');
    if(profileActions) {
        // 收藏按钮
        let bookmarkBtn = document.getElementById('igProfileBookmarkBtn');
        if(!bookmarkBtn) {
            bookmarkBtn = document.createElement('button');
            bookmarkBtn.id = 'igProfileBookmarkBtn';
            bookmarkBtn.className = 'action-btn secondary';
            bookmarkBtn.style.cssText = 'margin-left:10px;';
            bookmarkBtn.innerHTML = '<i class="far fa-bookmark"></i> 收藏';
            bookmarkBtn.onclick = () => this.renderBookmarks();
            profileActions.appendChild(bookmarkBtn);
                        // 网红数据面板按钮
            let statsBtn = document.getElementById('igProfileStatsBtn');
            if(!statsBtn) {
                statsBtn = document.createElement('button');
                statsBtn.id = 'igProfileStatsBtn';
                statsBtn.className = 'action-btn secondary';
                statsBtn.style.cssText = 'margin-left:10px;';
                statsBtn.innerHTML = '<i class="fas fa-chart-line"></i> 数据';
                statsBtn.onclick = () => this.openCreatorDashboard();
                profileActions.appendChild(statsBtn);
            }

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
                // 添加拖拽上传支持
        const preview = document.getElementById('igCreatePreview');
        if(preview && !preview.dataset.dragEnabled) {
            preview.dataset.dragEnabled = 'true';

            preview.ondragover = (e) => {
                e.preventDefault();
                preview.style.borderColor = '#0095f6';
                preview.style.background = 'rgba(0,149,246,0.1)';
            };

            preview.ondragleave = (e) => {
                e.preventDefault();
                preview.style.borderColor = '';
                preview.style.background = '';
            };

            preview.ondrop = (e) => {
                e.preventDefault();
                preview.style.borderColor = '';
                preview.style.background = '';

                const files = e.dataTransfer.files;
                if(files.length > 0 && files[0].type.startsWith('image/')) {
                    this.handlePhotoSelect(files[0]);
                }
            };

            // 点击预览区也可以上传
            preview.onclick = () => {
                if(!this.currentImageId && !this.isTextMode) {
                    document.getElementById('igPhotoInput').click();
                }
            };
            preview.style.cursor = 'pointer';
        }

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

        // 验证文件类型
        if(!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }

        // 验证文件大小（限制10MB）
        if(file.size > 10 * 1024 * 1024) {
            alert('图片过大请选择10MB以内的图片');
            return;
        }

        this.isTextMode = false;

        try {
            // 显示加载状态
            const preview = document.getElementById('igCreatePreview');
            preview.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:30px;"></i>';

            // 保存图片到IndexedDB
            const id = await window.db.saveImage(file);
            this.currentImageId = id;

            // 获取URL并预览
            const url = await window.db.getImage(id);
            preview.style.backgroundImage = `url('${url}')`;
            preview.style.backgroundSize = 'cover';
            preview.style.backgroundPosition = 'center';
            preview.innerHTML = '';

            this.showToast('✅ 图片已上传');
        } catch(e) {
            console.error('Image upload failed:', e);
            alert('图片上传失败请重试');
            document.getElementById('igCreatePreview').innerHTML = '<i class="fas fa-image"></i>';
        }
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
        // 发帖后更高概率触发互动
    if(Math.random() < 0.6) {
        setTimeout(() => this.simulateLiveInteraction(), 3000 + Math.random() * 5000);
    }

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
- 剩余评论来自随机用户
- 评论内容要口语化、真实、多样化（包括emoji、简短感叹、提问、调侃等）
- 每条评论可以有0-3条回复
- 可使用多语言（英日韩法等）增加真实感非中文必须提供中文翻译

【重要-用户名规范】：
- 所有用户名必须独特有个性
- 禁止使用：路人甲、路人乙、用户A、random_user、user1、评论者1等敷衍命名
- 正确示例：coffee_soul、night_owl_画手、melody_迷、vintage_vibes

返回 JSON:
{
    "likes": 数字,
    "shares": 数字,
    "bookmarks": 数字,
    "comments": [
        {
            "id": "唯一ID",
            "username": "独特的用户名",
            "text": "评论内容（可多语言）",
            "textZh": "评论中文翻译（如果text是中文则相同）",
            "likes": 点赞数,
            "time": 时间戳,
            "isFriend": 是否是好友(boolean),
            "replies": [
                {
                    "id": "回复ID",
                    "username": "独特的用户名",
                    "text": "回复内容",
                    "textZh": "回复中文翻译",
                    "likes": 0
                }
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
        textZh: c.textZh || c.text,
        likes: c.likes || 0,
        time: c.time || Date.now(),
        isFriend: !!friend,
        replies: (c.replies || []).map(r => ({
            id: r.id || window.Utils.generateId('rpl'),
            username: r.username,
            text: r.text,
            textZh: r.textZh || r.text,
            avatar: '',
            likes: r.likes || 0
        }))
    };
});

                    }
                }
            });
            this.renderHome();
                    // 计算并更新粉丝增长
                    const followerGain = this.calculateFollowerGain(
                        json.likes || 0,
                        json.comments?.length || 0,
                        json.shares || 0,
                        json.bookmarks || 0
                    );
                    this.updateFollowers(followerGain, '新帖互动');
                    this.updateTotalStats(json.likes || 0, json.comments?.length || 0);

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
// ==================== 粉丝动态增长系统 ====================

// 根据帖子互动计算涨粉
calculateFollowerGain(likes, comments, shares, bookmarks) {
    // 基础涨粉公式
    let gain = Math.floor(
        likes * 0.03 +
        comments * 0.15 +
        shares * 0.4 +
        bookmarks * 0.1
    );

    // 爆款加成：点赞超过500
    if(likes >= 500) {
        gain += Math.floor(likes * 0.05);
    }
    // 超级爆款：点赞超过1000
    if(likes >= 1000) {
        gain += Math.floor(likes * 0.1);
        // 记录爆款
        this.store.update(d => {
            if(!d.profile.viralPosts) d.profile.viralPosts = [];
            d.profile.viralPosts.push({
                time: Date.now(),
                likes: likes
            });
        });
    }

    // 随机波动 ±20%
    const fluctuation = 0.8 + Math.random() * 0.4;
    gain = Math.floor(gain * fluctuation);

    return Math.max(1, gain); // 至少涨1个粉
}

// 更新粉丝数并记录历史
updateFollowers(change, reason) {
    this.store.update(d => {
        const oldCount = d.profile.followers || 100;
        const newCount = Math.max(0, oldCount + change);
        d.profile.followers = newCount;

        // 记录历史（只保留最近50条）
        if(!d.profile.followerHistory) d.profile.followerHistory = [];
        d.profile.followerHistory.push({
            time: Date.now(),
            count: newCount,
            change: change,
            reason: reason
        });
        if(d.profile.followerHistory.length > 50) {
            d.profile.followerHistory = d.profile.followerHistory.slice(-50);
        }

        // 更新最后活跃时间
        d.profile.lastActiveTime = Date.now();
    });

    // 涨粉通知
    if(change > 0) {
        this.showFollowerNotification(change, reason);
    }
}

// 涨粉通知
showFollowerNotification(count, reason) {
    if(count >= 10) {
        this.showToast(`🎉 +${count} 新粉丝！${reason || ''}`);
    }

    if(Notification.permission === 'granted' && count >= 50) {
        new Notification('Instagram', {
            body: `🚀 你涨了 ${count} 个粉丝！${reason || ''}`,
            icon: '📈'
        });
    }
}

// 检查不活跃掉粉
checkInactivityLoss() {
    const data = this.store.get();
    const lastActive = data.profile.lastActiveTime || Date.now();
    const now = Date.now();
    const inactiveDays = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));

    if(inactiveDays >= 3) {
        // 3天以上不活跃开始掉粉
        let loss = 0;

        if(inactiveDays >= 7) {
            // 超过7天：掉粉 = 不活跃天数 * 随机(10~30) + 粉丝数 * 1%
            loss = inactiveDays * (10 + Math.floor(Math.random() * 20));
            loss += Math.floor((data.profile.followers || 100) * 0.01);
        } else {
            // 3-7天：轻微掉粉
            loss = inactiveDays * (5 + Math.floor(Math.random() * 10));
        }

        if(loss > 0) {
            this.updateFollowers(-loss, `${inactiveDays}天未更新`);
            this.showToast(`😢 因${inactiveDays}天未活跃流失了 ${loss} 位粉丝`);
        }
    }

    // 更新活跃时间（打开APP就算活跃）
    this.store.update(d => {
        d.profile.lastActiveTime = Date.now();
    });
}

// 累计互动数据
updateTotalStats(likes, comments) {
    this.store.update(d => {
        d.profile.totalLikes = (d.profile.totalLikes || 0) + likes;
        d.profile.totalComments = (d.profile.totalComments || 0) + comments;
    });
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

    // 检查是否开启自动回复
    const data = this.store.get();
    const settings = data.dmSettings[this.currentDmId] || { autoReply: false };

    if(settings.autoReply) {
        // 自动生成回复
        setTimeout(() => this.generateDMReply(), 1000 + Math.random() * 2000);
    }
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
// ==================== 新增：打开用户主页方法 ====================

async openUserProfile(userInfo) {
    // userInfo: {username, name, avatar} 或 字符串username
    const username = typeof userInfo === 'string' ? userInfo : userInfo.username;

    // 不打开自己的主页（使用原有Profile）
    if(username === 'me' || username === this.store.get().profile.username) {
        document.querySelector('[data-tab="ig-profile"]').click();
        return;
    }

    const profilePage = document.getElementById('igUserProfile');
    const loading = document.getElementById('igUserProfileLoading');
    const dataDiv = document.getElementById('igUserProfileData');

    profilePage.style.display = 'flex';
    loading.style.display = 'flex';
    dataDiv.style.display = 'none';

    document.getElementById('igUserProfileTitle').innerText = username;

    // 检查缓存
    let npcUser = this.store.getNpcUser(username);
    const now = Date.now();
    const cacheExpiry = 30 * 60 * 1000; // 30分钟缓存过期

    // 如果没有缓存或缓存过期重新生成
    if(!npcUser || (now - npcUser.lastUpdated > cacheExpiry)) {
        npcUser = await this.generateNpcUser(username, userInfo);
        if(npcUser) {
            this.store.saveNpcUser(username, npcUser);
        } else {
            loading.innerHTML = '<div style="color:#999;">加载失败请重试</div>';
            return;
        }
    }

    // 渲染用户资料
    await this.renderUserProfile(npcUser);

    loading.style.display = 'none';
    dataDiv.style.display = 'block';
}
// ==================== 修复：生成NPC用户数据 ====================

async generateNpcUser(username, existingInfo = {}) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) {
        return this.generateDefaultNpcUser(username, existingInfo);
    }

    const prompt = `生成一个真实的Instagram用户资料。用户名: "${username}"

【最重要-语言要求】：
- 所有内容必须使用中文！包括：姓名、简介、帖子文案、评论内容
- 禁止使用英文/日文/韩文等外语作为主要内容
- 用户名可以保留英文但其他所有文字必须是中文
- 例如：bio应该是"热爱生活的摄影师📸"而不是"Living my best life"

【用户名规范-严格执行】：
- 禁止使用以下任何敷衍命名：路人甲、路人乙、用户A、用户B、random_user、user1、user2、评论者1、评论者2、unknown、某某、小明、小红
- 每个人必须有独特个性的用户名
- 正确示例：咖啡成瘾患者、深夜画手、vintage_收藏家、都市漫游者、厨房实验室、追光摄影、书页间的猫

要求：
1. 根据用户名"${username}"推断用户风格和个性
2. 生成完整中文人设：真实姓名(中文)、个性签名(中文)、职业/身份
3. 生成合理数据：粉丝数(100-50000)、关注数(50-2000)
4. 生成5条该用户的原创帖子（中文文案符合其人设）
5. 生成5条该用户转发的帖子（中文转发评语和原帖内容）

返回JSON:
{
    "profile": {
        "name": "中文真实姓名",
        "username": "${username}",
        "bio": "中文个性签名可带emoji",
        "occupation": "职业或身份",
        "style": "发帖风格描述",
        "followers": 粉丝数,
        "following": 关注数
    },
    "posts": [
        {
            "id": "post_1",
            "caption": "中文帖子文案要有内容，不能只是用户名至少20个字可包含emoji和话题标签",
            "imagePrompt": "英文图片描述用于生成图片",
            "likes": 点赞数,
            "time": -3600000,
            "comments": [
                {
                    "username": "独特的中文或混合用户名",
                    "text": "中文评论内容"
                }
            ]
        }
    ],
    "reposts": [
        {
            "id": "repost_1",
            "repostComment": "中文转发评语",
            "time": -7200000,
            "originalPost": {
                "username": "原帖作者独特用户名",
                "caption": "中文原帖文案",
                "imagePrompt": "英文图片描述",
                "likes": 原帖点赞数,
                "comments": [
                    {
                        "username": "独特用户名",
                        "text": "中文评论"
                    }
                ]
            }
        }
    ]
}`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);

        let data = null;
        try {
            data = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\{[\s\S]*\}/);
            if(match) {
                try {
                    data = JSON.parse(match[0]);
                } catch(e2) {}
            }
        }

        if(!data || !data.profile) {
            return this.generateDefaultNpcUser(username, existingInfo);
        }

        // 处理帖子图片
        const processedPosts = [];
        for(const p of (data.posts || [])) {
            let imgId = null;
            if(p.imagePrompt && apiConfig.imageApiKey) {
                try {
                    const imgBase64 = await window.API.generateImage(p.imagePrompt, apiConfig);
                    imgId = await window.db.saveImage(imgBase64);
                } catch(e) { console.error('Image gen failed', e); }
            }
if(!imgId) {
    imgId = await window.db.saveImage(window.Utils.generateDefaultImage(p.caption || username));
}


            // 确保caption有实际内容
            let finalCaption = p.caption || '';
            if(!finalCaption || finalCaption.trim() === username || finalCaption.trim().length < 5) {
                finalCaption = `分享今天的日常～ #${username.replace(/_/g, '')} #生活记录`;
            }

            processedPosts.push({
                id: p.id || window.Utils.generateId('npc_post'),
                caption: finalCaption,
                image: imgId,
                likes: p.likes || Math.floor(Math.random() * 500) + 50,
                time: Date.now() + (p.time || -Math.floor(Math.random() * 86400000 * 7)),
                comments: (p.comments || []).map(c => ({
                    id: window.Utils.generateId('cmt'),
                    username: c.username || this.generateRandomUsername(),
                    text: c.text || '很棒！',
                    avatar: '',
                    likes: Math.floor(Math.random() * 50),
                    time: Date.now() - Math.floor(Math.random() * 3600000)
                }))
            });
        }

        // 处理转发
        const processedReposts = [];
        for(const r of (data.reposts || [])) {
            let imgId = null;
            const origPost = r.originalPost || {};

            if(origPost.imagePrompt && apiConfig.imageApiKey) {
                try {
                    const imgBase64 = await window.API.generateImage(origPost.imagePrompt, apiConfig);
                    imgId = await window.db.saveImage(imgBase64);
                } catch(e) { console.error('Repost image gen failed', e); }
            }
    if(!imgId) {
    imgId = await window.db.saveImage(window.Utils.generateDefaultImage(origPost.caption || '转发内容'));
}


            processedReposts.push({
                id: r.id || window.Utils.generateId('npc_repost'),
                repostComment: r.repostComment || '值得分享！',
                time: Date.now() + (r.time || -Math.floor(Math.random() * 86400000 * 14)),
                originalPost: {
                    id: window.Utils.generateId('orig'),
                    username: origPost.username || this.generateRandomUsername(),
                    caption: origPost.caption || '精彩内容',
                    image: imgId,
                    likes: origPost.likes || Math.floor(Math.random() * 1000) + 100,
                    comments: (origPost.comments || []).map(c => ({
                        id: window.Utils.generateId('cmt'),
                        username: c.username || this.generateRandomUsername(),
                        text: c.text || '不错！',
                        avatar: '',
                        likes: Math.floor(Math.random() * 30)
                    }))
                }
            });
        }

        // 生成头像
        let avatarId = existingInfo.avatar || '';
        if(!avatarId && apiConfig.imageApiKey) {
            try {
                const avatarPrompt = `Instagram profile picture of ${data.profile.name}, ${data.profile.occupation}, portrait photo, high quality, friendly expression`;
                const avatarBase64 = await window.API.generateImage(avatarPrompt, apiConfig);
                avatarId = await window.db.saveImage(avatarBase64);
            } catch(e) {
                avatarId = '';
            }
        }

        return {
            profile: {
                ...data.profile,
                avatar: avatarId,
                postsCount: processedPosts.length
            },
            posts: processedPosts,
            reposts: processedReposts
        };

    } catch(e) {
        console.error('Generate NPC user failed:', e);
        return this.generateDefaultNpcUser(username, existingInfo);
    }
}


// ==================== 修复：生成默认NPC用户（中文内容） ====================

async generateDefaultNpcUser(username, existingInfo = {}) {
    const styles = ['摄影爱好者', '美食博主', '旅行达人', '健身教练', '插画师', '音乐人', '时尚博主', '程序员', '读书分享', '宠物博主'];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];

    const bios = [
        '✨ 认真生活的每一天',
        '📸 用镜头记录美好瞬间',
        '🌍 世界那么大我想去看看',
        '💪 自律给我自由',
        '🎨 画画是我的快乐源泉',
        '🎵 音乐是灵魂的语言',
        '👗 穿搭分享 | 日常穿搭记录',
        '💻 代码改变世界',
        '📚 一年读100本书挑战中',
        '🐱 铲屎官的日常'
    ];

    const captions = [
        '今天天气真好出门走走～ #日常 #生活记录',
        '周末的小确幸一杯咖啡一本书 ☕📖',
        '分享最近很喜欢的一个角落 #我的小天地',
        '努力工作认真生活 💪',
        '记录生活中的美好瞬间 ✨',
        '今日份的快乐分享给你们 🌟',
        '又是元气满满的一天！',
        '生活需要仪式感 🎀',
        '简单的日子也要过得精彩 ⭐',
        '分享今天的好心情～'
    ];

    const commentTexts = [
        '太棒了！', '好喜欢！', '羡慕了～', '这也太好看了吧',
        '爱了爱了', '求同款！', '绝绝子', '太可了',
        '这个氛围感好棒', '被治愈到了', '好有feel', '收藏了！'
    ];

    const posts = [];
    for(let i = 0; i < 5; i++) {
const imgId = await window.db.saveImage(
    window.Utils.generateDefaultImage(`${username}的帖子 ${i+1}`)
);

        const randomComments = [];
        const commentCount = Math.floor(Math.random() * 3) + 2;
        for(let j = 0; j < commentCount; j++) {
            randomComments.push({
                id: window.Utils.generateId('cmt'),
                username: this.generateRandomUsername(),
                text: commentTexts[Math.floor(Math.random() * commentTexts.length)],
                avatar: '',
                likes: Math.floor(Math.random() * 20)
            });
        }

        posts.push({
            id: window.Utils.generateId('npc_post'),
            caption: captions[Math.floor(Math.random() * captions.length)],
            image: imgId,
            likes: Math.floor(Math.random() * 500) + 50,
            time: Date.now() - (i * 3600000 * 24),
            comments: randomComments
        });
    }

    const repostComments = ['太棒了必须转！', '分享给大家～', '这个绝了', '值得收藏', '强烈推荐！'];

    const reposts = [];
    for(let i = 0; i < 5; i++) {
const imgId = await window.db.saveImage(
    window.Utils.generateDefaultImage(`转发内容 ${i+1}`)
);


        const originalComments = [];
        for(let j = 0; j < 2; j++) {
            originalComments.push({
                id: window.Utils.generateId('cmt'),
                username: this.generateRandomUsername(),
                text: commentTexts[Math.floor(Math.random() * commentTexts.length)],
                avatar: '',
                likes: Math.floor(Math.random() * 15)
            });
        }

        reposts.push({
            id: window.Utils.generateId('npc_repost'),
            repostComment: repostComments[i % repostComments.length],
            time: Date.now() - ((i + 5) * 3600000 * 24),
            originalPost: {
                id: window.Utils.generateId('orig'),
                username: this.generateRandomUsername(),
                caption: captions[Math.floor(Math.random() * captions.length)],
                image: imgId,
                likes: Math.floor(Math.random() * 1000) + 100,
                comments: originalComments
            }
        });
    }

    // 生成中文名
    const surnames = ['林', '陈', '王', '李', '张', '刘', '周', '吴', '赵', '黄'];
    const givenNames = ['小雨', '晓晨', '思远', '子涵', '雨桐', '欣怡', '浩然', '梓萱', '一鸣', '诗涵'];
    const randomName = surnames[Math.floor(Math.random() * surnames.length)] + givenNames[Math.floor(Math.random() * givenNames.length)];

    return {
        profile: {
            name: existingInfo.name || randomName,
            username: username,
            bio: bios[Math.floor(Math.random() * bios.length)],
            occupation: randomStyle,
            style: randomStyle,
            avatar: existingInfo.avatar || '',
            followers: Math.floor(Math.random() * 10000) + 100,
            following: Math.floor(Math.random() * 500) + 50,
            postsCount: 5
        },
        posts: posts,
        reposts: reposts
    };
}

// ==================== 新增：渲染用户主页 ====================

async renderUserProfile(npcUser) {
    const profile = npcUser.profile;

    // 头像
    const avatarUrl = await this.getAvatarUrl(profile.avatar, profile.name);
    document.getElementById('igUserAvatar').style.backgroundImage = `url('${avatarUrl}')`;

    // 基本信息
    document.getElementById('igUserName').innerText = profile.name;

// 双语简介显示 - 优先显示中文
const bioEl = document.getElementById('igUserBio');
const hasBioChinese = /[\u4e00-\u9fa5]/.test(profile.bio);

if(profile.bioZh && profile.bio !== profile.bioZh) {
    if(!hasBioChinese) {
        // 原文非中文优先显示中文翻译
        bioEl.innerHTML = `
            <div style="margin-bottom:5px;">${profile.bioZh}</div>
            <div style="font-size:11px; color:#999; font-style:italic;">
                原文: ${profile.bio}
            </div>
        `;
    } else {
        // 原文是中文正常显示
        bioEl.innerText = profile.bio || '';
    }
} else {
    // 没有翻译或翻译相同
    bioEl.innerText = profile.bioZh || profile.bio || '';
}


    document.getElementById('igUserPosts').innerText = npcUser.posts?.length || 0;
    document.getElementById('igUserFollowers').innerText = this.formatNumber(profile.followers);
    document.getElementById('igUserFollowing').innerText = this.formatNumber(profile.following);

    // 关注按钮
    const followBtn = document.getElementById('igUserFollowBtn');
    followBtn.onclick = () => {
        if(followBtn.innerText === '关注') {
            followBtn.innerText = '已关注';
            followBtn.classList.add('secondary');
        } else {
            followBtn.innerText = '关注';
            followBtn.classList.remove('secondary');
        }
    };

    // 发消息按钮
    document.getElementById('igUserMessageBtn').onclick = () => {
        this.startDMWithUser(profile);
    };

    // 渲染帖子网格
    await this.renderUserPosts(npcUser.posts || []);

    // 渲染转发网格
    await this.renderUserReposts(npcUser.reposts || [], profile.username);

    // 重置Tab状态
    document.getElementById('igUserTabPosts').click();
}


// 格式化数字显示
formatNumber(num) {
    if(num >= 10000) return (num / 10000).toFixed(1) + 'w';
    if(num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}
// ==================== 新增：渲染用户帖子网格 ====================

async renderUserPosts(posts) {
    const grid = document.getElementById('igUserPostsGrid');
    grid.innerHTML = '';

    if(posts.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#999;">暂无帖子</div>';
        return;
    }

    for(const post of posts) {
        let imgUrl = post.image;
        if(imgUrl && imgUrl.startsWith('img_')) {
            imgUrl = await window.db.getImage(imgUrl);
        }

        const div = document.createElement('div');
        div.className = 'ig-grid-item';
        div.style.cssText = 'aspect-ratio:1; background-size:cover; background-position:center; cursor:pointer; position:relative;';
        div.style.backgroundImage = `url('${imgUrl}')`;

        // 悬停显示点赞数
        div.innerHTML = `
            <div style="position:absolute; inset:0; background:rgba(0,0,0,0.3); display:none; justify-content:center; align-items:center; color:#fff; font-weight:bold;">
                <i class="fas fa-heart"></i> ${post.likes}
            </div>
        `;

        div.onmouseenter = () => div.firstElementChild.style.display = 'flex';
        div.onmouseleave = () => div.firstElementChild.style.display = 'none';

        div.onclick = () => this.openNpcPostDetail(post);

        grid.appendChild(div);
    }
}
// ==================== 新增：渲染用户转发网格 ====================

async renderUserReposts(reposts, username) {
    const grid = document.getElementById('igUserRepostsGrid');
    grid.innerHTML = '';

    if(reposts.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">暂无转发</div>';
        return;
    }

    for(const repost of reposts) {
        let imgUrl = repost.originalPost?.image;
        if(imgUrl && imgUrl.startsWith('img_')) {
            imgUrl = await window.db.getImage(imgUrl);
        }

        // 双语转发评语
        let repostCommentHtml = repost.repostComment || '';
        if(repost.repostCommentZh && repost.repostComment !== repost.repostCommentZh) {
            repostCommentHtml = `
                <div>${repost.repostComment}</div>
                <div style="font-size:12px; color:#888; background:#f0f0f0; padding:4px 8px; border-radius:4px; margin-top:5px; display:inline-block;">
                    📝 ${repost.repostCommentZh}
                </div>
            `;
        }

        // 双语原帖文案预览
        let originalCaptionPreview = repost.originalPost?.caption || '';
        if(repost.originalPost?.captionZh && repost.originalPost.caption !== repost.originalPost.captionZh) {
            originalCaptionPreview = repost.originalPost.captionZh;
        }

        const div = document.createElement('div');
        div.style.cssText = 'background:#fafafa; border-radius:12px; margin-bottom:15px; overflow:hidden; border:1px solid #efefef;';

        div.innerHTML = `
            <div style="padding:12px; display:flex; align-items:center; gap:10px; border-bottom:1px solid #efefef;">
                <i class="fas fa-retweet" style="color:#00ba7c;"></i>
                <span style="font-weight:bold;">${username}</span>
                <span style="color:#666;">转发了</span>
            </div>
            <div style="padding:10px; font-size:14px; color:#333;">
                ${repostCommentHtml}
            </div>
            <div style="display:flex; padding:10px; gap:10px; background:#fff; cursor:pointer;" class="repost-original">
                <div style="width:80px; height:80px; background-image:url('${imgUrl}'); background-size:cover; background-position:center; border-radius:8px; flex-shrink:0;"></div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:bold; font-size:13px;">@${repost.originalPost?.username}</div>
                    <div style="font-size:13px; color:#666; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">
                        ${originalCaptionPreview}
                    </div>
                    <div style="font-size:12px; color:#999; margin-top:5px;">
                        <i class="far fa-heart"></i> ${repost.originalPost?.likes || 0}
                    </div>
                </div>
            </div>
        `;

        // 点击原帖查看详情
        div.querySelector('.repost-original').onclick = () => {
            this.openRepostDetail(repost);
        };

        grid.appendChild(div);
    }
}
// ==================== 修复：打开NPC帖子详情（添加互动功能） ====================

async openNpcPostDetail(post) {
    const detail = document.getElementById('igPostDetail');
    const content = document.getElementById('igDetailContent');
    content.innerHTML = '';

    // 存储当前NPC帖子用于互动
    this.currentNpcPost = post;

    let imgUrl = post.image;
    if(imgUrl && imgUrl.startsWith('img_')) {
        imgUrl = await window.db.getImage(imgUrl);
    }

    const postDiv = document.createElement('div');
    postDiv.className = 'ig-post';

    // 检查是否已点赞/收藏
    const isLiked = post.userLiked || false;
    const isBookmarked = post.userBookmarked || false;

    postDiv.innerHTML = `
        <div class="ig-post-img" style="background-image:url('${imgUrl}'); min-height:300px; background-size:cover; background-position:center;"></div>
        <div class="ig-post-actions">
            <div class="ig-action-left">
                <i class="${isLiked ? 'fas' : 'far'} fa-heart ig-npc-like-btn" style="cursor:pointer; ${isLiked ? 'color:#ed4956;' : ''}"></i>
                <i class="far fa-comment"></i>
                <i class="far fa-paper-plane ig-npc-share-btn" style="cursor:pointer;"></i>
            </div>
            <i class="${isBookmarked ? 'fas' : 'far'} fa-bookmark ig-npc-bookmark-btn" style="cursor:pointer; ${isBookmarked ? 'color:#000;' : ''}"></i>
        </div>
        <div class="ig-likes ig-npc-likes-count">${post.likes || 0} likes</div>
        <div class="ig-caption">${post.caption || ''}</div>
        <div class="ig-time">${this.timeSince(post.time)} AGO</div>
    `;

    // 点赞按钮
    postDiv.querySelector('.ig-npc-like-btn').onclick = (e) => {
        const btn = e.target;
        if(btn.classList.contains('far')) {
            btn.className = 'fas fa-heart ig-npc-like-btn';
            btn.style.color = '#ed4956';
            post.likes = (post.likes || 0) + 1;
            post.userLiked = true;
        } else {
            btn.className = 'far fa-heart ig-npc-like-btn';
            btn.style.color = '';
            post.likes = Math.max(0, (post.likes || 1) - 1);
            post.userLiked = false;
        }
        postDiv.querySelector('.ig-npc-likes-count').innerText = `${post.likes} likes`;
    };

    // 收藏按钮
    postDiv.querySelector('.ig-npc-bookmark-btn').onclick = (e) => {
        const btn = e.target;
        if(btn.classList.contains('far')) {
            btn.className = 'fas fa-bookmark ig-npc-bookmark-btn';
            btn.style.color = '#000';
            post.userBookmarked = true;
            alert('已收藏');
        } else {
            btn.className = 'far fa-bookmark ig-npc-bookmark-btn';
            btn.style.color = '';
            post.userBookmarked = false;
        }
    };

    // 分享按钮
    postDiv.querySelector('.ig-npc-share-btn').onclick = () => {
        this.shareNpcPost(post);
    };

    // 图片双击点赞
    postDiv.querySelector('.ig-post-img').ondblclick = () => {
        const likeBtn = postDiv.querySelector('.ig-npc-like-btn');
        if(likeBtn.classList.contains('far')) {
            likeBtn.click();
        }
        // 显示爱心动画
        const imgDiv = postDiv.querySelector('.ig-post-img');
        const heart = document.createElement('i');
        heart.className = 'fas fa-heart';
        heart.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%, -50%) scale(0); color:#fff; font-size:80px; transition:transform 0.2s; pointer-events:none; text-shadow:0 0 10px rgba(0,0,0,0.5);';
        imgDiv.style.position = 'relative';
        imgDiv.appendChild(heart);
        setTimeout(() => heart.style.transform = 'translate(-50%, -50%) scale(1.2)', 50);
        setTimeout(() => heart.style.transform = 'translate(-50%, -50%) scale(0)', 800);
        setTimeout(() => heart.remove(), 1000);
    };

    content.appendChild(postDiv);

    // 评论区
    const commentsDiv = document.createElement('div');
    commentsDiv.id = 'igNpcCommentsDiv';
    commentsDiv.style.padding = '15px';
    commentsDiv.innerHTML = '<h4 style="margin-bottom:15px;">评论</h4>';

    if(post.comments && post.comments.length > 0) {
        for(const c of post.comments) {
            const commentEl = await this.createNpcCommentElement(c, post);
            commentsDiv.appendChild(commentEl);
        }
    } else {
        const emptyDiv = document.createElement('div');
        emptyDiv.id = 'igNpcEmptyComments';
        emptyDiv.style.cssText = 'color:#999; text-align:center; padding:20px;';
        emptyDiv.innerText = '暂无评论快来抢沙发！';
        commentsDiv.appendChild(emptyDiv);
    }

    content.appendChild(commentsDiv);

    // 评论输入框
    const inputArea = document.createElement('div');
    inputArea.style.cssText = 'position:sticky; bottom:0; background:#fff; padding:10px; border-top:1px solid #efefef; display:flex; gap:10px;';
    inputArea.innerHTML = `
        <input id="igNpcCommentInput" placeholder="添加评论..." style="flex:1; border:1px solid #dbdbdb; border-radius:20px; padding:8px 15px; outline:none;">
        <button id="igNpcCommentSend" style="background:#0095f6; color:#fff; border:none; border-radius:20px; padding:8px 20px; cursor:pointer; font-weight:bold;">发布</button>
    `;
    content.appendChild(inputArea);

    document.getElementById('igNpcCommentSend').onclick = () => this.addNpcPostComment(post);
    document.getElementById('igNpcCommentInput').onkeypress = (e) => {
        if(e.key === 'Enter') this.addNpcPostComment(post);
    };

    detail.style.display = 'flex';
}

// 创建NPC帖子评论元素
async createNpcCommentElement(c, post) {
    const div = document.createElement('div');
    div.style.marginBottom = '15px';

    const avatar = await this.getAvatarUrl(c.avatar, c.username);

    div.innerHTML = `
        <div style="display:flex; gap:10px;">
            <div class="comment-avatar" style="width:32px; height:32px; border-radius:50%; background-image:url('${avatar}'); background-size:cover; flex-shrink:0; cursor:pointer;"></div>
            <div style="flex:1;">
                <div>
                    <span class="comment-username" style="font-weight:bold; cursor:pointer;">${c.username}</span>
                </div>
                <div style="margin:3px 0;">${(() => {
    const text = c.text || '';
    const hasChinese = /[\u4e00-\u9fa5]/.test(text);
    if(c.textZh && text !== c.textZh && !hasChinese) {
        return `${c.textZh}<div style="margin-top:4px; font-size:11px; color:#888; font-style:italic;">原文: ${text}</div>`;
    }
    return text;
})()}</div>

                <div style="display:flex; gap:15px; font-size:12px; color:#8e8e8e;">
                    <span>${this.timeSince(c.time || Date.now())}</span>
                    <span class="npc-comment-like-btn" style="cursor:pointer;"><i class="far fa-heart"></i> ${c.likes || 0}</span>
                    <span class="npc-comment-reply-btn" style="cursor:pointer;">回复</span>
                </div>
            </div>
        </div>
    `;

    // 点击头像/用户名打开主页
    div.querySelector('.comment-avatar').onclick = () => {
        this.openUserProfile({ username: c.username, name: c.username, avatar: c.avatar });
    };
    div.querySelector('.comment-username').onclick = () => {
        this.openUserProfile({ username: c.username, name: c.username, avatar: c.avatar });
    };

    // 评论点赞
    div.querySelector('.npc-comment-like-btn').onclick = (e) => {
        c.likes = (c.likes || 0) + 1;
        e.currentTarget.innerHTML = `<i class="fas fa-heart" style="color:#ed4956;"></i> ${c.likes}`;
    };

    // 回复按钮
    div.querySelector('.npc-comment-reply-btn').onclick = () => {
        const input = document.getElementById('igNpcCommentInput');
        input.value = `@${c.username} `;
        input.focus();
    };

    return div;
}

// 添加NPC帖子评论
async addNpcPostComment(post) {
    const input = document.getElementById('igNpcCommentInput');
    const text = input.value.trim();
    if(!text) return;

    const profile = this.store.get().profile;

    const newComment = {
        id: window.Utils.generateId('cmt'),
        username: profile.username || 'me',
        avatar: profile.avatar,
        text: text,
        likes: 0,
        time: Date.now()
    };

    if(!post.comments) post.comments = [];
    post.comments.push(newComment);

    input.value = '';

    // 移除"暂无评论"提示
    const emptyDiv = document.getElementById('igNpcEmptyComments');
    if(emptyDiv) emptyDiv.remove();

    // 添加新评论到界面
    const commentsDiv = document.getElementById('igNpcCommentsDiv');
    const commentEl = await this.createNpcCommentElement(newComment, post);
    commentsDiv.appendChild(commentEl);

    // 自动生成回复
    this.generateNpcCommentReply(post, newComment);
}

// 生成NPC评论回复
async generateNpcCommentReply(post, userComment) {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return;

    const prompt = `Instagram场景：用户在一个帖子下评论了"${userComment.text}"

请生成1-3条其他人对这条评论的回复。

【语言要求】：必须使用中文回复！

【用户名规范】：
- 禁止使用：路人甲、路人乙、用户A、评论者1等
- 必须用独特个性的用户名如：咖啡爱好者、深夜画手、都市漫游

返回JSON数组:
[
    {
        "username": "独特的中文用户名",
        "text": "中文回复内容口语化自然"
    }
]`;

    try {
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

        const res = await window.API.callAI(prompt, apiConfig);

        let replies = [];
        try {
            replies = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\[[\s\S]*\]/);
            if(match) replies = JSON.parse(match[0]);
        }

        if(Array.isArray(replies) && replies.length > 0) {
            const commentsDiv = document.getElementById('igNpcCommentsDiv');

            for(const r of replies) {
                const newReply = {
                    id: window.Utils.generateId('cmt'),
                    username: r.username || this.generateRandomUsername(),
                    avatar: '',
                    text: r.text || '说得对！',
                    likes: Math.floor(Math.random() * 10),
                    time: Date.now()
                };

                post.comments.push(newReply);

                const replyEl = await this.createNpcCommentElement(newReply, post);
                commentsDiv.appendChild(replyEl);
            }
        }
    } catch(e) {
        console.error('Generate NPC reply failed:', e);
    }
}

// 分享NPC帖子
shareNpcPost(post) {
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
    if(qqData.friends.length === 0) return alert('暂无好友可分享');

    const names = qqData.friends.map((f, i) => `${i+1}. ${f.name}`).join('\n');
    const choice = prompt(`分享给谁？(输入序号)\n${names}`);
    const idx = parseInt(choice) - 1;

    if(idx >= 0 && idx < qqData.friends.length) {
        const friend = qqData.friends[idx];
        const msg = `[分享帖子] ${post.caption?.substring(0, 50) || '精彩内容'}...`;

        if(!qqData.messages) qqData.messages = {};
        if(!qqData.messages[friend.id]) qqData.messages[friend.id] = [];
        qqData.messages[friend.id].push({
            id: Date.now(),
            senderId: 'user',
            senderName: qqData.user?.name || '我',
            content: msg,
            type: 'text',
            timestamp: Date.now(),
            status: 'normal'
        });
        localStorage.setItem('qq_data', JSON.stringify(qqData));
        alert(`已分享给 ${friend.name}`);
    }
}


// ==================== 新增：打开转发详情（含原帖和评论） ====================

async openRepostDetail(repost) {
    const detail = document.getElementById('igRepostDetail');
    const content = document.getElementById('igRepostDetailContent');
    content.innerHTML = '';

    const originalPost = repost.originalPost;
    if(!originalPost) return;

    let imgUrl = originalPost.image;
    if(imgUrl && imgUrl.startsWith('img_')) {
        imgUrl = await window.db.getImage(imgUrl);
    }

    const originalAvatar = await this.getAvatarUrl('', originalPost.username);

    // 双语原帖文案
    let captionHtml = originalPost.caption || '';
    if(originalPost.captionZh && originalPost.caption !== originalPost.captionZh) {
        captionHtml = `
            <div>${originalPost.caption}</div>
            <div style="margin-top:8px; font-size:13px; color:#666; background:#f8f8f8; padding:8px 12px; border-radius:8px; border-left:3px solid #e1306c;">
                📝 ${originalPost.captionZh}
            </div>
        `;
    }

    // 原帖区域
    const postDiv = document.createElement('div');
    postDiv.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid #efefef;">
            <div class="original-avatar" style="width:40px; height:40px; border-radius:50%; background-image:url('${originalAvatar}'); background-size:cover; cursor:pointer;"></div>
            <div>
                <div class="original-username" style="font-weight:bold; cursor:pointer;">${originalPost.username}</div>
                <div style="font-size:12px; color:#999;">原帖</div>
            </div>
        </div>
        <div style="margin:15px 0;">
            <img src="${imgUrl}" style="width:100%; border-radius:8px;">
        </div>
        <div style="display:flex; gap:15px; padding:10px 0; border-bottom:1px solid #efefef;">
            <span><i class="far fa-heart"></i> ${originalPost.likes || 0}</span>
            <span><i class="far fa-comment"></i> ${originalPost.comments?.length || 0}</span>
        </div>
        <div style="padding:15px 0;">
            ${captionHtml}
        </div>
    `;

    // 原帖作者点击事件
    postDiv.querySelector('.original-avatar').onclick = () => {
        this.openUserProfile({ username: originalPost.username, name: originalPost.username, avatar: '' });
    };
    postDiv.querySelector('.original-username').onclick = () => {
        this.openUserProfile({ username: originalPost.username, name: originalPost.username, avatar: '' });
    };

    content.appendChild(postDiv);

    // 评论区
    const commentsDiv = document.createElement('div');
    commentsDiv.innerHTML = '<h4 style="margin:15px 0; padding-top:15px; border-top:1px solid #efefef;">评论</h4>';

    if(originalPost.comments && originalPost.comments.length > 0) {
        for(const c of originalPost.comments) {
            const avatar = await this.getAvatarUrl(c.avatar, c.username);

            // 双语评论
            let commentTextHtml = c.text;
            if(c.textZh && c.text !== c.textZh) {
                commentTextHtml = `
                    <span>${c.text}</span>
                    <div style="font-size:11px; color:#888; background:#f5f5f5; padding:3px 6px; border-radius:4px; margin-top:3px; display:inline-block;">
                        📝 ${c.textZh}
                    </div>
                `;
            }

            const commentEl = document.createElement('div');
            commentEl.style.cssText = 'display:flex; gap:10px; margin-bottom:15px;';
            commentEl.innerHTML = `
                <div class="commenter-avatar" style="width:32px; height:32px; border-radius:50%; background-image:url('${avatar}'); background-size:cover; cursor:pointer;"></div>
                <div>
                    <span class="commenter-username" style="font-weight:bold; cursor:pointer;">${c.username}</span>
                    <div style="margin-top:3px;">${commentTextHtml}</div>
                    <div style="font-size:12px; color:#999; margin-top:3px;"><i class="far fa-heart"></i> ${c.likes || 0}</div>
                </div>
            `;

            // 评论者点击事件
            commentEl.querySelector('.commenter-avatar').onclick = () => {
                this.openUserProfile({ username: c.username, name: c.username, avatar: c.avatar });
            };
            commentEl.querySelector('.commenter-username').onclick = () => {
                this.openUserProfile({ username: c.username, name: c.username, avatar: c.avatar });
            };

            commentsDiv.appendChild(commentEl);
        }
    } else {
        commentsDiv.innerHTML += '<div style="text-align:center; color:#999; padding:20px;">暂无评论</div>';
    }

    content.appendChild(commentsDiv);
    detail.style.display = 'flex';
}

// ==================== 新增：开始与用户私信 ====================

startDMWithUser(profile) {
    const data = this.store.get();

    // 检查是否已有对话
    let existingDm = data.dms?.find(d => d.participant.username === profile.username);

    if(!existingDm) {
        const dmId = window.Utils.generateId('dm');
        this.store.update(d => {
            if(!d.dms) d.dms = [];
            d.dms.push({
                id: dmId,
                participant: {
                    name: profile.name,
                    username: profile.username,
                    avatar: profile.avatar || ''
                },
                messages: []
            });
        });
        existingDm = { id: dmId };
    }

    this.renderDMs();
    document.getElementById('igDmWindow').style.display = 'flex';
    this.openDMWindow(existingDm.id);
}
// ==================== 新增：生成随机有个性的用户名 ====================

generateRandomUsername() {
    const prefixes = ['sunny_', 'night_', 'coffee_', 'moon_', 'star_', 'cloud_', 'ocean_', 'forest_', 'dream_', 'pixel_', 'vintage_', 'urban_', 'cozy_', 'lazy_', 'happy_', 'chill_'];
    const middles = ['猫咪', '小鱼', '画手', '旅人', '吃货', '书虫', '摄影', '音乐', 'vibes', 'soul', 'mood', 'life', 'day', 'zone'];
    const suffixes = ['', '_ok', '_go', '2024', '_daily', '_log', '喵', '酱', '_君'];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const middle = middles[Math.floor(Math.random() * middles.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    return prefix + middle + suffix;
}
// 打开私信设置
openDMSettings() {
    if(!this.currentDmId) return;

    const data = this.store.get();
    const settings = data.dmSettings[this.currentDmId] || { autoReply: false };
    const dm = data.dms.find(d => d.id === this.currentDmId);
    if(!dm) return;

    // 移除已存在的设置弹窗
    const existing = document.getElementById('igDmSettingsModal');
    if(existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'igDmSettingsModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:320px;">
            <h3 style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
                <span>私信设置</span>
                <i class="fas fa-times" style="cursor:pointer;" id="closeDmSettings"></i>
            </h3>
            <div style="margin-bottom:15px; color:#666; font-size:14px;">
                与 <strong>${dm.participant.name}</strong> 的对话设置
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:#f8f8f8; border-radius:10px;">
                <div>
                    <div style="font-weight:bold;">自动回复</div>
                    <div style="font-size:12px; color:#999;">发送消息后自动生成对方回复</div>
                </div>
                <label class="switch" style="position:relative; display:inline-block; width:50px; height:26px;">
                    <input type="checkbox" id="igDmAutoReplyToggle" ${settings.autoReply ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                    <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${settings.autoReply ? '#0095f6' : '#ccc'}; transition:.3s; border-radius:26px;">
                        <span style="position:absolute; content:''; height:20px; width:20px; left:${settings.autoReply ? '26px' : '3px'}; bottom:3px; background-color:white; transition:.3s; border-radius:50%;"></span>
                    </span>
                </label>
            </div>
            <div style="margin-top:20px; text-align:center;">
                <button id="saveDmSettings" class="action-btn" style="width:100%;">保存</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 开关交互效果
    const toggle = document.getElementById('igDmAutoReplyToggle');
    const slider = toggle.nextElementSibling;
    const dot = slider.querySelector('span');

    toggle.onchange = () => {
        if(toggle.checked) {
            slider.style.backgroundColor = '#0095f6';
            dot.style.left = '26px';
        } else {
            slider.style.backgroundColor = '#ccc';
            dot.style.left = '3px';
        }
    };

    document.getElementById('closeDmSettings').onclick = () => modal.remove();
    modal.onclick = (e) => { if(e.target === modal) modal.remove(); };

    document.getElementById('saveDmSettings').onclick = () => {
        const autoReply = document.getElementById('igDmAutoReplyToggle').checked;
        this.store.update(d => {
            if(!d.dmSettings) d.dmSettings = {};
            d.dmSettings[this.currentDmId] = { autoReply };
        });
        modal.remove();
        // 显示提示
        const tip = autoReply ? '已开启自动回复' : '已关闭自动回复';
        this.showToast(tip);
    };
}

// 显示提示
showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed; bottom:100px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:#fff; padding:10px 20px; border-radius:20px; z-index:9999; font-size:14px;';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}
// ==================== 清除所有Instagram数据 ====================

async clearAllData() {
    // 二次确认
    const confirmed = confirm('⚠️ 警告！\n\n此操作将永久删除您在Instagram的所有数据：\n\n• 所有帖子和快拍\n• 所有私信对话\n• 个人资料和头像\n• 所有缓存数据\n\n此操作不可撤销！确定要继续吗？');

    if(!confirmed) return;

    // 再次确认
    const doubleConfirm = confirm('🔴 最后确认\n\n真的要清除所有数据吗？');

    if(!doubleConfirm) return;

    this.showToast('正在清除数据...');

    try {
        // 获取当前数据以清理IndexedDB中的图片
        const data = this.store.get();

        // 收集所有需要删除的图片ID
        const imageIds = [];

        // 帖子图片
        if(data.posts) {
            data.posts.forEach(p => {
                if(p.image && p.image.startsWith('img_')) imageIds.push(p.image);
                if(p.avatar && p.avatar.startsWith('img_')) imageIds.push(p.avatar);
            });
        }

        // 快拍图片
        if(data.stories) {
            data.stories.forEach(s => {
                if(s.image && s.image.startsWith('img_')) imageIds.push(s.image);
            });
        }

        // 用户头像
        if(data.profile && data.profile.avatar && data.profile.avatar.startsWith('img_')) {
            imageIds.push(data.profile.avatar);
        }

        // NPC用户数据中的图片
        if(data.npcUsers) {
            Object.values(data.npcUsers).forEach(npc => {
                if(npc.profile && npc.profile.avatar && npc.profile.avatar.startsWith('img_')) {
                    imageIds.push(npc.profile.avatar);
                }
                if(npc.posts) {
                    npc.posts.forEach(p => {
                        if(p.image && p.image.startsWith('img_')) imageIds.push(p.image);
                    });
                }
                if(npc.reposts) {
                    npc.reposts.forEach(r => {
                        if(r.originalPost && r.originalPost.image && r.originalPost.image.startsWith('img_')) {
                            imageIds.push(r.originalPost.image);
                        }
                    });
                }
            });
        }

        // 删除IndexedDB中的图片
        if(window.db && window.db.deleteImage) {
            for(const imgId of imageIds) {
                try {
                    await window.db.deleteImage(imgId);
                } catch(e) {
                    console.warn('Failed to delete image:', imgId, e);
                }
            }
        }

        // 重置Instagram数据到初始状态
        const initialData = {
            profile: {
                name: '我',
                username: 'me',
                bio: 'Life is good.',
                posts: 0,
                followers: 100,
                following: 50,
                avatar: '',
                pronouns: '',
                gender: ''
            },
            posts: [],
            stories: [],
            dms: [],
            npcUsers: {},
            dmSettings: {}
        };

        this.store.set(initialData);

        // 关闭所有打开的子页面
        const subPages = ['igDmWindow', 'igChatWindow', 'igPostDetail', 'igUserProfile', 'igRepostDetail', 'igBookmarksPage'];
        subPages.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });

        // 刷新界面
        await this.renderProfile('me');
        await this.renderHome();

        this.showToast('✅ 所有数据已清除');

        // 通知
        if(Notification.permission === 'granted') {
            new Notification('Instagram', {
                body: '所有数据已成功清除',
                icon: '🗑️'
            });
        }

    } catch(e) {
        console.error('Clear data failed:', e);
        this.showToast('❌ 清除失败请重试');
    }
}
// ==================== 创作者数据面板 ====================

openCreatorDashboard() {
    const data = this.store.get();
    const profile = data.profile;
    const posts = data.posts.filter(p => p.userId === 'me');

    // 计算统计数据
    const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.comments?.length || 0), 0);
    const totalShares = posts.reduce((sum, p) => sum + (p.shares || 0), 0);
    const avgLikes = posts.length ? Math.floor(totalLikes / posts.length) : 0;

    // 计算互动率
    const engagementRate = profile.followers > 0
        ? ((totalLikes + totalComments) / profile.followers / Math.max(1, posts.length) * 100).toFixed(2)
        : 0;

    // 获取粉丝变化趋势
    const history = profile.followerHistory || [];
    const recentGain = history.filter(h => h.time > Date.now() - 7 * 24 * 60 * 60 * 1000)
        .reduce((sum, h) => sum + (h.change || 0), 0);

    // 热门帖子（按点赞排序）
    const topPosts = [...posts].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 3);

    // 移除已存在的弹窗
    const existing = document.getElementById('igCreatorDashboard');
    if(existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'igCreatorDashboard';
    modal.className = 'sub-page';
    modal.style.cssText = 'display:flex; position:absolute; top:0; left:0; right:0; bottom:0; z-index:105; background:#fff; flex-direction:column;';

    modal.innerHTML = `
        <div class="sub-header">
            <button class="back-btn" id="closeCreatorDashboard"><i class="fas fa-arrow-left"></i></button>
            <span class="sub-title">创作者数据</span>
            <div style="width:24px;"></div>
        </div>
        <div style="flex:1; overflow-y:auto; padding:15px;">

            <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:20px;">
                <div style="background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; padding:20px; border-radius:15px; text-align:center;">
                    <div style="font-size:28px; font-weight:bold;">${this.formatNumber(profile.followers || 0)}</div>
                    <div style="font-size:12px; opacity:0.9;">粉丝</div>
                    <div style="font-size:11px; margin-top:5px; ${recentGain >= 0 ? 'color:#7fff7f;' : 'color:#ff7f7f;'}">
                        ${recentGain >= 0 ? '↑' : '↓'} ${Math.abs(recentGain)} (7天)
                    </div>
                </div>
                <div style="background:linear-gradient(135deg,#f093fb,#f5576c); color:#fff; padding:20px; border-radius:15px; text-align:center;">
                    <div style="font-size:28px; font-weight:bold;">${engagementRate}%</div>
                    <div style="font-size:12px; opacity:0.9;">互动率</div>
                    <div style="font-size:11px; margin-top:5px;">平均每帖</div>
                </div>
            </div>


            <div style="background:#f8f9fa; border-radius:15px; padding:15px; margin-bottom:20px;">
                <h4 style="margin:0 0 15px 0; color:#333;">📊 总体数据</h4>
                <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; text-align:center;">
                    <div>
                        <div style="font-size:18px; font-weight:bold; color:#ed4956;">${this.formatNumber(totalLikes)}</div>
                        <div style="font-size:11px; color:#999;">总点赞</div>
                    </div>
                    <div>
                        <div style="font-size:18px; font-weight:bold; color:#0095f6;">${this.formatNumber(totalComments)}</div>
                        <div style="font-size:11px; color:#999;">总评论</div>
                    </div>
                    <div>
                        <div style="font-size:18px; font-weight:bold; color:#00ba7c;">${this.formatNumber(totalShares)}</div>
                        <div style="font-size:11px; color:#999;">总转发</div>
                    </div>
                    <div>
                        <div style="font-size:18px; font-weight:bold; color:#8e44ad;">${posts.length}</div>
                        <div style="font-size:11px; color:#999;">帖子数</div>
                    </div>
                </div>
            </div>


            <div style="background:#fff3cd; border-radius:10px; padding:12px; margin-bottom:20px; font-size:13px;">
                <strong>💡 涨粉小贴士：</strong>
                <ul style="margin:10px 0 0 0; padding-left:20px; color:#856404;">
                    <li>帖子点赞越多涨粉越快</li>
                    <li>点赞 >500 触发爆款加成</li>
                    <li>点赞 >1000 触发超级爆款</li>
                    <li>超过3天不发帖会掉粉哦～</li>
                </ul>
            </div>


            <div style="margin-bottom:20px;">
                <h4 style="margin:0 0 15px 0; color:#333;">🔥 热门帖子 TOP3</h4>
                <div id="dashboardTopPosts"></div>
            </div>


            <div>
                <h4 style="margin:0 0 15px 0; color:#333;">📈 最近粉丝变化</h4>
                <div id="dashboardFollowerHistory" style="max-height:200px; overflow-y:auto;"></div>
            </div>
        </div>
    `;

    document.getElementById('instagramApp').appendChild(modal);

    document.getElementById('closeCreatorDashboard').onclick = () => modal.remove();

    // 渲染热门帖子
    this.renderTopPosts(topPosts);

    // 渲染粉丝历史
    this.renderFollowerHistory(history);
}

async renderTopPosts(topPosts) {
    const container = document.getElementById('dashboardTopPosts');
    if(!container) return;

    if(topPosts.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">还没有帖子快去发布吧！</div>';
        return;
    }

    container.innerHTML = '';

    for(const post of topPosts) {
        let imgUrl = post.image;
        if(imgUrl && imgUrl.startsWith('img_')) {
            imgUrl = await window.db.getImage(imgUrl);
        }

        const div = document.createElement('div');
        div.style.cssText = 'display:flex; gap:10px; padding:10px; background:#fff; border-radius:10px; margin-bottom:10px; box-shadow:0 1px 3px rgba(0,0,0,0.1); cursor:pointer;';
        div.innerHTML = `
            <div style="width:60px; height:60px; background-image:url('${imgUrl}'); background-size:cover; background-position:center; border-radius:8px; flex-shrink:0;"></div>
            <div style="flex:1; min-width:0;">
                <div style="font-size:13px; color:#333; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${post.caption?.substring(0, 30) || '无文案'}...</div>
                <div style="display:flex; gap:15px; margin-top:8px; font-size:12px; color:#999;">
                    <span><i class="fas fa-heart" style="color:#ed4956;"></i> ${post.likes || 0}</span>
                    <span><i class="fas fa-comment" style="color:#0095f6;"></i> ${post.comments?.length || 0}</span>
                    <span><i class="fas fa-share" style="color:#00ba7c;"></i> ${post.shares || 0}</span>
                </div>
            </div>
        `;
        div.onclick = () => this.openPostDetail(post);
        container.appendChild(div);
    }
}

renderFollowerHistory(history) {
    const container = document.getElementById('dashboardFollowerHistory');
    if(!container) return;

    if(history.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">暂无记录</div>';
        return;
    }

    container.innerHTML = '';

    // 倒序显示最新的在前
    const recent = [...history].reverse().slice(0, 20);

    recent.forEach(h => {
        const div = document.createElement('div');
        div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f0f0f0; font-size:13px;';

        const changeColor = h.change >= 0 ? '#00ba7c' : '#ed4956';
        const changeIcon = h.change >= 0 ? '↑' : '↓';

        div.innerHTML = `
            <div>
                <span style="color:${changeColor}; font-weight:bold;">${changeIcon} ${Math.abs(h.change)}</span>
                <span style="color:#999; margin-left:8px;">${h.reason || ''}</span>
            </div>
            <div style="color:#999; font-size:11px;">${this.timeSince(h.time)}</div>
        `;
        container.appendChild(div);
    });
}
// ==================== 增强活人感 - NPC主动互动系统 ====================

// 模拟真实社交环境：NPC主动来评论、点赞、私信
async simulateLiveInteraction() {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return;

    const data = this.store.get();
    const posts = data.posts.filter(p => p.userId === 'me');

    if(posts.length === 0) return;

    // 随机选择一个帖子
    const randomPost = posts[Math.floor(Math.random() * posts.length)];

    // 获取好友
    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
    const friends = qqData.friends.slice(0, 5);

    const interactionTypes = ['comment', 'like', 'dm', 'follow'];
    const type = interactionTypes[Math.floor(Math.random() * interactionTypes.length)];

    switch(type) {
        case 'comment':
            await this.generateRandomComment(randomPost, friends);
            break;
        case 'like':
            this.generateRandomLikes(randomPost);
            break;
        case 'dm':
            await this.generateRandomDM(friends);
            break;
        case 'follow':
            this.generateRandomFollow();
            break;
    }
}

// 随机新评论
async generateRandomComment(post, friends) {
    const apiConfig = window.API.getConfig();

    const prompt = `为Instagram帖子"${post.caption?.substring(0, 50)}"生成一条真实的评论。

【语言要求】：必须使用中文！

返回JSON: {"username": "独特用户名", "text": "中文评论内容"}`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let json = null;
        try {
            json = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\{[\s\S]*?\}/);
            if(match) json = JSON.parse(match[0]);
        }

        if(json && json.text) {
            const newComment = {
                id: window.Utils.generateId('cmt'),
                username: json.username || this.generateRandomUsername(),
                avatar: '',
                text: json.text,
                likes: 0,
                time: Date.now()
            };

            this.store.update(d => {
                const p = d.posts.find(x => x.id === post.id);
                if(p) {
                    if(!p.comments) p.comments = [];
                    p.comments.push(newComment);
                }
            });

            // 通知
            if(Notification.permission === 'granted') {
                new Notification('Instagram', {
                    body: `💬 ${newComment.username} 评论了你的帖子`,
                    icon: '📸'
                });
            }
            this.showToast(`💬 ${newComment.username} 评论了你的帖子`);

            // 评论也涨粉
            this.updateFollowers(Math.floor(Math.random() * 3) + 1, '新评论');
        }
    } catch(e) {
        console.error('Generate random comment failed:', e);
    }
}

// 随机点赞
generateRandomLikes(post) {
    const addLikes = Math.floor(Math.random() * 20) + 5;

    this.store.update(d => {
        const p = d.posts.find(x => x.id === post.id);
        if(p) {
            p.likes = (p.likes || 0) + addLikes;
        }
    });

    this.showToast(`❤️ 你的帖子新增了 ${addLikes} 个赞`);

    // 点赞涨粉
    const followerGain = Math.floor(addLikes * 0.05);
    if(followerGain > 0) {
        this.updateFollowers(followerGain, '帖子获赞');
    }
}

// 随机私信
async generateRandomDM(friends) {
    const apiConfig = window.API.getConfig();

    // 50%概率是好友，50%是陌生人
    const isFriend = Math.random() > 0.5 && friends.length > 0;
    let sender;

    if(isFriend) {
        sender = friends[Math.floor(Math.random() * friends.length)];
    } else {
        sender = {
            name: this.generateRandomUsername(),
            avatar: ''
        };
    }

    const prompt = `生成一条Instagram私信内容。发送者是${isFriend ? '朋友' : '陌生粉丝'}。

【语言要求】：必须使用中文！
内容可以是：打招呼、赞美、请教问题、分享日常等

返回JSON: {"message": "中文私信内容"}`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let json = null;
        try {
            json = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\{[\s\S]*?\}/);
            if(match) json = JSON.parse(match[0]);
        }

        if(json && json.message) {
            const dmId = window.Utils.generateId('dm');

            this.store.update(d => {
                if(!d.dms) d.dms = [];

                // 检查是否已有对话
                let existingDm = d.dms.find(dm => dm.participant.name === sender.name);

                if(existingDm) {
                    existingDm.messages.push({
                        sender: 'them',
                        text: json.message,
                        time: Date.now()
                    });
                } else {
                    d.dms.push({
                        id: dmId,
                        participant: {
                            name: sender.name,
                            username: sender.name.toLowerCase().replace(/\s/g, '_'),
                            avatar: sender.avatar || ''
                        },
                        messages: [{
                            sender: 'them',
                            text: json.message,
                            time: Date.now()
                        }]
                    });
                }
            });

            if(Notification.permission === 'granted') {
                new Notification('Instagram 私信', {
                    body: `📩 ${sender.name}: ${json.message.substring(0, 30)}...`,
                    icon: '💬'
                });
            }
            this.showToast(`📩 ${sender.name} 给你发了私信`);
        }
    } catch(e) {
        console.error('Generate random DM failed:', e);
    }
}

// 随机涨粉
generateRandomFollow() {
    const gain = Math.floor(Math.random() * 10) + 1;
    this.updateFollowers(gain, '自然增长');
}
// 生成DM回复
async generateDMReply() {
    const apiConfig = window.API.getConfig();
    if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

    const data = this.store.get();
    const dm = data.dms.find(d => d.id === this.currentDmId);
    if(!dm) return;

    const btn = document.getElementById('igGenReplyBtn');
    if(btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }

    // 获取最近消息作为上下文
    const recentMessages = dm.messages.slice(-10).map(m =>
        `${m.sender === 'me' ? '我' : dm.participant.name}: ${m.text}`
    ).join('\n');

    const prompt = `你是Instagram用户"${dm.participant.name}"，正在和对方私信聊天。

最近对话：
${recentMessages}

请以${dm.participant.name}的身份回复一条消息。

【要求】：
1. 必须使用中文
2. 回复要自然、口语化
3. 可以带emoji
4. 内容多样：可以是回应、提问、分享日常等

返回JSON: {"reply": "回复内容"}`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let json = null;
        try {
            json = JSON.parse(res);
        } catch(e) {
            const match = res.match(/\{[\s\S]*?\}/);
            if(match) json = JSON.parse(match[0]);
        }

        if(json && json.reply) {
            this.store.update(d => {
                const targetDm = d.dms.find(x => x.id === this.currentDmId);
                if(targetDm) {
                    targetDm.messages.push({
                        sender: 'them',
                        text: json.reply,
                        time: Date.now()
                    });
                }
            });
            this.renderDMMessages();
        }
    } catch(e) {
        console.error('Generate DM reply failed:', e);
        alert('生成回复失败');
    } finally {
        if(btn) {
            btn.innerHTML = '<i class="fas fa-magic"></i>';
            btn.disabled = false;
        }
    }
}

// 触发随机互动（在关键时机调用）
triggerRandomInteraction() {
    // 30%概率触发
    if(Math.random() < 0.3) {
        // 延迟1-5秒执行模拟真实
        const delay = 1000 + Math.random() * 4000;
        setTimeout(() => this.simulateLiveInteraction(), delay);
    }
}

}

window.InstagramApp = new InstagramApp();
