class InstagramStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('instagram_data')) {
            const initialData = {
                profile: { name: '我', username: 'me', bio: 'Life is good.', posts: 0, followers: 100, following: 50, avatar: '', pronouns: '', gender: '' },
                posts: [], // {id, userId, username, avatar, image, caption, likes, time, comments:[], filter: ''}
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
                document.querySelectorAll('.ig-nav-item').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.ig-tab-page').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                const tabId = btn.dataset.tab;
                
                if(tabId === 'ig-create') {
                    this.openCreateModal();
                    document.querySelector('[data-tab="ig-home"]').click();
                    return;
                }

                document.getElementById(tabId).classList.add('active');
                
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
        if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
        
        let postImg = p.image;
        if(postImg && postImg.startsWith('img_')) postImg = await window.db.getImage(postImg);

        div.innerHTML = `
            <div class="ig-post-header">
                <div class="ig-avatar-small" style="background-image:url('${avatar || window.Utils.generateDefaultAvatar(p.username)}')"></div>
                <div class="ig-username">${p.username}</div>
                <i class="fas fa-ellipsis-h"></i>
            </div>
            <div class="ig-post-img" style="background-image:url('${postImg}'); filter:${p.filter || 'none'};"></div>
            <div class="ig-post-actions">
                <div class="ig-action-left">
                    <i class="far fa-heart ig-like-btn"></i>
                    <i class="far fa-comment"></i>
                    <i class="far fa-paper-plane ig-share-btn"></i>
                </div>
                <i class="far fa-bookmark"></i>
            </div>
            <div class="ig-likes">${p.likes} likes</div>
            <div class="ig-caption"><span>${p.username}</span> ${p.caption}</div>
            <div class="ig-time">${this.timeSince(p.time)} AGO</div>
        `;

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

        div.querySelector('.ig-like-btn').onclick = () => this.likePost(p.id, p.isFriend);
        div.querySelector('.ig-share-btn').onclick = () => this.sharePost(p);
        
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
        
        const postEl = await this.createPostElement(p);
        content.appendChild(postEl);
        
        const commentsDiv = document.createElement('div');
        commentsDiv.style.padding = '10px';
        commentsDiv.innerHTML = '<h4>Comments</h4>';
        
        if(p.comments && p.comments.length > 0) {
            p.comments.forEach(c => {
                const div = document.createElement('div');
                div.style.marginBottom = '10px';
                div.innerHTML = `<span style="font-weight:bold;margin-right:5px;">${c.username}</span>${c.text}`;
                commentsDiv.appendChild(div);
            });
        } else {
            commentsDiv.innerHTML += '<div style="color:#999;">No comments yet</div>';
        }
        
        content.appendChild(commentsDiv);
        detail.style.display = 'flex';
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
            try {
                posts = JSON.parse(res);
            } catch(e) {
                const match = res.match(/\[[\s\S]*\]/);
                if(match) posts = JSON.parse(match[0]);
            }
            
            if(Array.isArray(posts)) {
                const newPosts = [];
                for(const p of posts) {
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

                this.store.update(d => d.posts.push(...newPosts));
                this.renderHome();
            }
        } catch(e) {
            console.error(e);
            alert('生成失败');
        } finally {
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
        const style = document.createElement('style');
        style.innerHTML = `#${container.id} > div::-webkit-scrollbar { display: none; }`;
        container.appendChild(style);
        
        const myStory = document.createElement('div');
        myStory.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer;';
        myStory.innerHTML = `
            <div style="width:60px; height:60px; border-radius:50%; background:#eee; border:2px solid #fff; outline:2px solid #dbdbdb; display:flex; justify-content:center; align-items:center; font-size:20px;">+</div>
            <span style="font-size:12px;">Your Story</span>
        `;
        myStory.onclick = () => document.getElementById('igStoryInput').click();
        storiesDiv.appendChild(myStory);

        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        for(const f of qqData.friends) {
            let avatar = f.avatar;
            if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);

            const s = document.createElement('div');
            s.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer;';
            s.innerHTML = `
                <div style="width:60px; height:60px; border-radius:50%; background:url('${avatar}'); background-size:cover; border:2px solid #fff; outline:2px solid #e1306c;"></div>
                <span style="font-size:12px;">${f.name}</span>
            `;
            const storyImg = window.Utils.generateDefaultImage(`Story by ${f.name}`);
            s.onclick = () => this.openStoryViewer(f.name, avatar, storyImg);
            storiesDiv.appendChild(s);
        }
        
        const myStories = this.store.get().stories || [];
        for(const s of myStories) {
             const div = document.createElement('div');
             div.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer;';
             const profile = this.store.get().profile;
             let avatar = profile.avatar;
             if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
             
             div.innerHTML = `
                <div style="width:60px; height:60px; border-radius:50%; background:url('${avatar}'); background-size:cover; border:2px solid #fff; outline:2px solid #e1306c;"></div>
                <span style="font-size:12px;">Me</span>
             `;
             
             let img = s.image;
             if(img && img.startsWith('img_')) img = await window.db.getImage(img);
             
             div.onclick = () => this.openStoryViewer('Me', avatar, img);
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
        
        let avatar = p.avatar;
        if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
        
        document.getElementById('igProfileAvatar').style.backgroundImage = `url('${avatar || 'https://picsum.photos/100/100'}')`;
        document.getElementById('igProfileName').innerText = p.name;
        document.getElementById('igProfileBio').innerText = p.bio;
        document.getElementById('igStatPosts').innerText = posts.length;
        document.getElementById('igStatFollowers').innerText = p.followers || 0;
        document.getElementById('igStatFollowing').innerText = p.following || 0;

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
            document.getElementById('igEditProfileBtn').onclick = () => {
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.style.display = 'flex';
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>编辑资料</h3>
                        <div class="form-group"><label>名称</label><input id="igEditName" value="${p.name}"></div>
                        <div class="form-group"><label>用户名 (ID)</label><input id="igEditUsername" value="${p.username}"></div>
                        <div class="form-group"><label>人称代词</label><input id="igEditPronouns" value="${p.pronouns || ''}"></div>
                        <div class="form-group"><label>性别</label><input id="igEditGender" value="${p.gender || ''}"></div>
                        <div class="form-group"><label>简介</label><textarea id="igEditBio">${p.bio}</textarea></div>
                        <div style="display:flex; gap:10px; margin-top:20px;">
                            <button class="action-btn secondary" onclick="this.closest('.modal').remove()">取消</button>
                            <button class="action-btn" id="igSaveProfile">保存</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                
                document.getElementById('igSaveProfile').onclick = () => {
                    this.store.update(d => {
                        d.profile.name = document.getElementById('igEditName').value;
                        d.profile.username = document.getElementById('igEditUsername').value;
                        d.profile.pronouns = document.getElementById('igEditPronouns').value;
                        d.profile.gender = document.getElementById('igEditGender').value;
                        d.profile.bio = document.getElementById('igEditBio').value;
                    });
                    this.renderProfile('me');
                    modal.remove();
                };
            };
            
            document.getElementById('igProfileAvatar').onclick = () => {
                const input = document.createElement('input'); 
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e) => {
                    if(e.target.files[0]) {
                        try {
                            const id = await window.db.saveImage(e.target.files[0]);
                            this.store.update(d => d.profile.avatar = id);
                            // 强制刷新头像显示
                            const url = await window.db.getImage(id);
                            document.getElementById('igProfileAvatar').style.backgroundImage = `url('${url}')`;
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
            
            const grd = ctx.createLinearGradient(0, 0, 600, 600);
            grd.addColorStop(0, "#f09433");
            grd.addColorStop(1, "#bc1888");
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, 600, 600);
            
            ctx.fillStyle = "white";
            ctx.font = "bold 40px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, 300, 300);
            
            const url = canvas.toDataURL('image/jpeg');
            this.currentImageId = await window.db.saveImage(url);
        }

        if(!this.currentImageId) return alert('请先选择图片或输入文字');

        const profile = this.store.get().profile;
        
        const newPost = {
            id: window.Utils.generateId('ig'),
            userId: 'me',
            username: profile.username,
            avatar: profile.avatar,
            image: this.currentImageId,
            caption: caption,
            likes: 0,
            time: Date.now(),
            comments: [],
            filter: this.currentFilter || 'none'
        };

        this.store.update(d => d.posts.push(newPost));

        document.getElementById('igCreateModal').style.display = 'none';
        this.renderHome();
        
        // Trigger AI Interactions
        this.generateInteractions(newPost.id, caption);
    }

    async generateInteractions(postId, caption) {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return;
        
        const prompt = `用户发布了 Ins: "${caption}"。
        请生成 3-5 条评论，以及点赞数。
        返回 JSON: {
            "likes": 56,
            "comments": [{"username": "User", "text": "Comment"}]
        }`;
        
        try {
            const res = await window.API.callAI(prompt, apiConfig);
            const json = JSON.parse(res);
            
            this.store.update(d => {
                const p = d.posts.find(x => x.id === postId);
                if(p) {
                    p.likes = json.likes;
                    p.comments = json.comments;
                }
            });
            this.renderHome();
            
            if(Notification.permission === 'granted') {
                new Notification('Instagram', { body: `你的帖子收到了 ${json.comments.length} 条评论` });
            }
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
}

window.InstagramApp = new InstagramApp();
