class CoupleStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('couple_data')) {
            const initialData = {
                currentPartnerId: null,
                relationships: {} // { partnerId: { startDate, photos:[], notes:[], diaries:[], tasks:[] } }
            };
            localStorage.setItem('couple_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('couple_data')); }
    set(data) { localStorage.setItem('couple_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class CoupleApp {
    constructor() {
        this.store = new CoupleStore();
        this.initUI();
    }

    initUI() {
        // Check Phone Check Mode
        if (window.System && window.System.isPhoneCheckMode) {
            // Add Generate Activity Button
            if(!document.getElementById('cpGenActivityBtn')) {
                const btn = document.createElement('div');
                btn.id = 'cpGenActivityBtn';
                btn.className = 'ff-fab'; // Reuse fanfic fab style
                btn.style.bottom = '80px';
                btn.style.background = '#ff4d4f';
                btn.innerHTML = '<i class="fas fa-magic"></i>';
                btn.onclick = () => this.generateActivity();
                document.getElementById('coupleApp').appendChild(btn);
            }
        } else {
            // Normal Mode Generate Button
            if(!document.getElementById('cpNormalGenBtn')) {
                const btn = document.createElement('div');
                btn.id = 'cpNormalGenBtn';
                btn.className = 'ff-fab';
                btn.style.bottom = '80px';
                btn.style.background = '#ff4d4f';
                btn.innerHTML = '<i class="fas fa-magic"></i>';
                btn.onclick = () => this.generateActivity();
                document.getElementById('coupleApp').appendChild(btn);
            }
        }

        // Bind UI events
        const closeCoupleApp = document.getElementById('closeCoupleApp');
        if(closeCoupleApp) closeCoupleApp.onclick = () => window.showPage('homeScreen');

        // Sub pages
        document.getElementById('closePhotoWall').onclick = () => this.showSubPage('coupleHome');
        document.getElementById('closeNoteBoard').onclick = () => this.showSubPage('coupleHome');
        document.getElementById('closeDiary').onclick = () => this.showSubPage('coupleHome');

        document.getElementById('btnPhotoWall').onclick = () => { this.renderPhotoWall(); this.showSubPage('photoWallPage'); };
        document.getElementById('btnNoteBoard').onclick = () => { this.renderNotes(); this.showSubPage('noteBoardPage'); };
        document.getElementById('btnDiary').onclick = () => { this.renderDiaries(); this.showSubPage('diaryPage'); };

        // Actions
        document.getElementById('addPhotoBtn').onclick = () => document.getElementById('photoInput').click();
        document.getElementById('photoInput').onchange = (e) => this.uploadPhoto(e.target.files[0]);

        document.getElementById('sendNoteBtn').onclick = () => this.sendNote();
        document.getElementById('writeDiaryBtn').onclick = () => this.writeDiary();
    }

    showSubPage(id) {
        document.querySelectorAll('.couple-page').forEach(el => el.style.display = 'none');
        document.getElementById(id).style.display = 'flex';
    }

    render() {
        const data = this.store.get();
        if(!data.currentPartnerId) {
            this.renderBindPage();
        } else {
            this.renderHome();
        }
    }

    renderBindPage() {
        this.showSubPage('coupleBindPage');
        const list = document.getElementById('bindList');
        list.innerHTML = '';
        
        let friends = [];
        try {
            const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
            friends = qqData.friends || [];
        } catch(e) {
            console.error('Failed to load QQ friends', e);
        }

        if(friends.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">暂无好友，请先在 QQ 中添加好友</div>';
            return;
        }

        const data = this.store.get();
        
        // Add "Switch Partner" section if there are existing relationships
        if(Object.keys(data.relationships).length > 0) {
            const switchDiv = document.createElement('div');
            switchDiv.innerHTML = '<h3>切换对象</h3>';
            Object.keys(data.relationships).forEach(pid => {
                const f = friends.find(x => x.id === pid);
                if(f) {
                    const item = document.createElement('div');
                    item.className = 'bind-item';
                    item.style.border = '1px solid #ff4d4f';
                    item.innerHTML = `<div class="contact-avatar" style="background-image:url('${f.avatar}')"></div><span>${f.name}</span>`;
                    item.onclick = () => {
                        this.store.update(d => d.currentPartnerId = pid);
                        this.renderHome();
                    };
                    switchDiv.appendChild(item);
                }
            });
            list.appendChild(switchDiv);
            list.appendChild(document.createElement('hr'));
        }

        friends.forEach(f => {
            if(data.relationships[f.id]) return; // Already bound

            const div = document.createElement('div');
            div.className = 'bind-item';
            div.innerHTML = `
                <div class="contact-avatar" style="background-image:url('${f.avatar}')"></div>
                <span>${f.name}</span>
            `;
            div.onclick = () => {
                if(confirm(`确定要和 ${f.name} 绑定情侣关系吗？`)) {
                    this.store.update(d => {
                        d.currentPartnerId = f.id;
                        d.relationships[f.id] = {
                            startDate: Date.now(),
                            photos: [],
                            notes: [],
                            diaries: [],
                            tasks: [
                                {id: 1, text: '一起看一次日出', completed: false},
                                {id: 2, text: '互换头像一天', completed: false},
                                {id: 3, text: '为对方写一首诗', completed: false}
                            ]
                        };
                    });
                    this.renderHome();
                }
            };
            list.appendChild(div);
        });
    }

    async renderHome() {
        this.showSubPage('coupleHome');
        const data = this.store.get();
        const rel = data.relationships[data.currentPartnerId];
        if(!rel) {
            this.store.update(d => d.currentPartnerId = null);
            return this.renderBindPage();
        }

        const qqData = JSON.parse(localStorage.getItem('qq_data'));
        const partner = qqData.friends.find(f => f.id === data.currentPartnerId);
        const user = qqData.user;

        // Switch Button
        if(!document.getElementById('switchPartnerBtn')) {
            const btn = document.createElement('button');
            btn.id = 'switchPartnerBtn';
            btn.className = 'icon-btn';
            btn.style.cssText = 'position:absolute; top:10px; right:10px; color:#fff;';
            btn.innerHTML = '<i class="fas fa-exchange-alt"></i>';
            btn.onclick = () => {
                this.store.update(d => d.currentPartnerId = null);
                this.renderBindPage();
            };
            document.querySelector('.couple-header').appendChild(btn);
        }

        // Avatars
        let uAvatar = user.avatar;
        if(uAvatar && uAvatar.startsWith('img_')) uAvatar = await window.db.getImage(uAvatar);
        document.getElementById('cUserAvatar').style.backgroundImage = `url('${uAvatar}')`;

        let pAvatar = partner ? partner.avatar : '';
        if(pAvatar && pAvatar.startsWith('img_')) pAvatar = await window.db.getImage(pAvatar);
        else if(partner) pAvatar = window.Utils.generateDefaultAvatar(partner.name);
        document.getElementById('cPartnerAvatar').style.backgroundImage = `url('${pAvatar}')`;

        // Days
        const days = Math.floor((Date.now() - rel.startDate) / (1000 * 60 * 60 * 24)) + 1;
        document.getElementById('daysCount').innerText = days;

        // Anniversary Check
        if (days % 100 === 0 || days === 365 || days === 520) {
            this.triggerAnniversary(partner, days);
        }

        // Render Tasks Preview (Simplified)
        if(!document.getElementById('taskPreview')) {
            const taskDiv = document.createElement('div');
            taskDiv.id = 'taskPreview';
            taskDiv.style.cssText = 'padding:20px; background:#fff; margin:20px; border-radius:15px; box-shadow:0 2px 10px rgba(0,0,0,0.05);';
            taskDiv.innerHTML = '<h3>甜蜜打卡</h3><ul id="taskList" style="list-style:none; margin-top:10px;"></ul>';
            document.querySelector('.couple-menu').after(taskDiv);
        }
        this.renderTasks();
    }

    async triggerAnniversary(partner, days) {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert(`🎉 恭喜！今天是你们在一起的第 ${days} 天纪念日！`);

        // Check if already celebrated today
        const lastCeleb = localStorage.getItem(`anniversary_${partner.id}_${days}`);
        if(lastCeleb) return;

        const prompt = `今天是你们在一起的第 ${days} 天纪念日。你扮演 ${partner.name}。\n人设: ${partner.persona}\n请给用户写一段感人的纪念日寄语，或者提议怎么庆祝。`;
        
        try {
            const msg = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
            alert(`🎉 纪念日快乐！\n\n${partner.name}: ${msg}`);
            
            // Add to notes
            this.store.update(d => {
                const r = d.relationships[partner.id];
                r.notes.unshift({
                    id: Date.now(),
                    senderId: partner.id,
                    content: `[纪念日] ${msg}`,
                    time: Date.now()
                });
            });
            localStorage.setItem(`anniversary_${partner.id}_${days}`, 'true');
        } catch(e) {}
    }

    renderTasks() {
        const list = document.getElementById('taskList');
        if(!list) return;
        list.innerHTML = '';
        const data = this.store.get();
        const rel = data.relationships[data.currentPartnerId];
        const tasks = rel ? rel.tasks : [];
        
        tasks.forEach(t => {
            const li = document.createElement('li');
            li.style.cssText = 'display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #eee;';
            li.innerHTML = `
                <input type="checkbox" ${t.completed ? 'checked' : ''}>
                <span style="${t.completed ? 'text-decoration:line-through;color:#999;' : ''}">${t.text}</span>
            `;
            li.querySelector('input').onchange = () => {
                this.store.update(d => {
                    const r = d.relationships[d.currentPartnerId];
                    const task = r.tasks.find(x => x.id === t.id);
                    if(task) task.completed = !task.completed;
                });
                this.renderTasks();
            };
            list.appendChild(li);
        });
        
        // Add Task Button
        const addBtn = document.createElement('button');
        addBtn.innerText = '+ 添加任务';
        addBtn.style.cssText = 'margin-top:10px; border:none; background:none; color:#ff4d4f; cursor:pointer;';
        addBtn.onclick = () => {
            const text = prompt('输入新任务:');
            if(text) {
                this.store.update(d => {
                    const r = d.relationships[d.currentPartnerId];
                    if(!r.tasks) r.tasks = [];
                    r.tasks.push({id: Date.now(), text, completed: false});
                });
                this.renderTasks();
            }
        };
        list.appendChild(addBtn);
    }

    async renderPhotoWall() {
        const list = document.getElementById('photoList');
        list.innerHTML = '<div class="photo-item add-photo" id="addPhotoBtnInner"><i class="fas fa-plus"></i></div>';
        document.getElementById('addPhotoBtnInner').onclick = () => document.getElementById('photoInput').click();

        const data = this.store.get();
        const rel = data.relationships[data.currentPartnerId];
        const photos = rel ? rel.photos : [];

        for(const p of photos) {
            const url = await window.db.getImage(p.url_id);
            const div = document.createElement('div');
            div.className = 'photo-item';
            div.style.backgroundImage = `url('${url}')`;
            div.onclick = () => {
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.style.display = 'flex';
                modal.style.background = 'rgba(0,0,0,0.9)';
                modal.innerHTML = `
                    <div style="position:relative;width:100%;height:100%;display:flex;justify-content:center;align-items:center;">
                        <img src="${url}" style="max-width:100%;max-height:100%;object-fit:contain;">
                        <button class="icon-btn" style="position:absolute;top:20px;right:20px;color:#fff;font-size:24px;background:transparent;border:none;" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
                    </div>
                `;
                document.body.appendChild(modal);
            };
            list.appendChild(div);
        }
    }

    async uploadPhoto(file) {
        if(!file) return;
        const id = await window.db.saveImage(file);
        this.store.update(d => {
            const r = d.relationships[d.currentPartnerId];
            r.photos.push({id: Date.now(), url_id: id});
        });
        this.renderPhotoWall();
    }

    async renderNotes() {
        const list = document.getElementById('noteList');
        list.innerHTML = '';
        const data = this.store.get();
        const rel = data.relationships[data.currentPartnerId];
        const notes = rel ? rel.notes : [];
        const qqData = JSON.parse(localStorage.getItem('qq_data'));
        const partner = qqData.friends.find(f => f.id === data.currentPartnerId);

        for(const n of notes) {
            const isMe = n.senderId === 'user';
            const name = isMe ? qqData.user.name : partner.name;
            let avatar = isMe ? qqData.user.avatar : partner.avatar;
            if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
            else if(!isMe) avatar = window.Utils.generateDefaultAvatar(name);

            const div = document.createElement('div');
            div.className = 'note-card';
            div.innerHTML = `
                <div class="note-header">
                    <div class="note-avatar" style="background-image:url('${avatar}')"></div>
                    <span style="font-weight:bold;font-size:12px;">${name}</span>
                    <span class="note-time">${window.Utils.formatTime(n.time)}</span>
                </div>
                <div class="note-content">${n.content}</div>
            `;
            list.appendChild(div);
        }
    }

    async sendNote() {
        const input = document.getElementById('noteInput');
        const text = input.value.trim();
        if(text) {
            this.store.update(d => {
                const r = d.relationships[d.currentPartnerId];
                r.notes.unshift({
                    id: Date.now(),
                    senderId: 'user',
                    content: text,
                    time: Date.now()
                });
            });
            input.value = '';
            this.renderNotes();
            
            // AI Reply
            const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
            if(apiConfig.chatApiKey) {
                const qqData = JSON.parse(localStorage.getItem('qq_data'));
                const partner = qqData.friends.find(f => f.id === this.store.get().currentPartnerId);
                const prompt = `你扮演 ${partner.name}。\n人设: ${partner.persona}\n用户在情侣空间发了一条碎碎念: "${text}"。\n请回复一条简短的碎碎念。`;
                try {
                    const reply = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
                    this.store.update(d => {
                        const r = d.relationships[d.currentPartnerId];
                        r.notes.unshift({
                            id: Date.now(),
                            senderId: partner.id,
                            content: reply,
                            time: Date.now()
                        });
                    });
                    this.renderNotes();
                } catch(e) { console.error(e); }
            }
        }
    }

    renderDiaries() {
        const list = document.getElementById('diaryList');
        list.innerHTML = '';
        const data = this.store.get();
        const rel = data.relationships[data.currentPartnerId];
        const diaries = rel ? rel.diaries : [];
        const qqData = JSON.parse(localStorage.getItem('qq_data'));
        const partner = qqData.friends.find(f => f.id === data.currentPartnerId);
        
        diaries.forEach(d => {
            const isMe = d.senderId === 'user';
            const div = document.createElement('div');
            div.className = 'diary-item';
            div.style.borderLeftColor = isMe ? '#333' : '#ff4d4f';
            
            if (isMe) {
                div.innerHTML = `
                    <div class="diary-date">${new Date(d.time).toLocaleString()} <span style="float:right;font-weight:bold;">我</span></div>
                    <div class="diary-preview">${d.content}</div>
                `;
            } else {
                // 对方的日记，增加“偷看”效果
                div.innerHTML = `
                    <div class="diary-date">${new Date(d.time).toLocaleString()} <span style="float:right;font-weight:bold;">${partner.name}</span></div>
                    <div class="diary-cover" style="padding:20px;text-align:center;cursor:pointer;background:#fff0f6;border-radius:5px;margin-top:5px;">
                        <i class="fas fa-lock"></i> 点击偷看TA的日记
                    </div>
                    <div class="diary-preview" style="display:none;">${d.content}</div>
                `;
                div.querySelector('.diary-cover').onclick = function() {
                    this.style.display = 'none';
                    div.querySelector('.diary-preview').style.display = 'block';
                    // 模拟偷看提示
                    if(Math.random() > 0.7) alert(`你悄悄打开了 ${partner.name} 的日记...`);
                };
            }
            list.appendChild(div);
        });
    }

    writeDiary() {
        const content = prompt('写下今天的心情...');
        if(content) {
            this.store.update(d => {
                const r = d.relationships[d.currentPartnerId];
                r.diaries.unshift({
                    id: Date.now(),
                    senderId: 'user',
                    content: content,
                    time: Date.now()
                });
            });
            this.renderDiaries();
        }
    }

    async triggerRandomActivity() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return;

        const data = this.store.get();
        if(!data.currentPartnerId) return;

        const qqData = JSON.parse(localStorage.getItem('qq_data'));
        const partner = qqData.friends.find(f => f.id === data.currentPartnerId);
        if(!partner) return;

        // 0: Note, 1: Diary
        const action = Math.random() > 0.5 ? 0 : 1;

        try {
            if(action === 0) {
                // Post Note
                const prompt = `你扮演 ${partner.name}。\n人设: ${partner.persona}\n请在情侣空间的碎碎念板上写一句话，表达对用户的思念或分享此刻的心情。`;
                const content = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
                if(content) {
                    this.store.update(d => {
                        const r = d.relationships[d.currentPartnerId];
                        r.notes.unshift({
                            id: Date.now(),
                            senderId: partner.id,
                            content: content,
                            time: Date.now()
                        });
                    });
                    // Only render if current page is note board, but calling renderNotes is safe if container exists
                    if(document.getElementById('noteBoardPage').style.display !== 'none') this.renderNotes();
                    if(Notification.permission === 'granted') new Notification(partner.name, {body: '在情侣空间发了一条碎碎念'});
                }
            } else {
                // Write Diary
                const prompt = `你扮演 ${partner.name}。\n人设: ${partner.persona}\n请写一篇简短的私密日记，记录你对用户的真实想法、今天发生的小事，或者一些羞于当面说的话。\n要求：第一人称，情感真挚，口语化。`;
                const content = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
                if(content) {
                    this.store.update(d => {
                        const r = d.relationships[d.currentPartnerId];
                        r.diaries.unshift({
                            id: Date.now(),
                            senderId: partner.id,
                            content: content,
                            time: Date.now()
                        });
                    });
                    if(document.getElementById('diaryPage').style.display !== 'none') this.renderDiaries();
                    if(Notification.permission === 'granted') new Notification(partner.name, {body: '写了一篇新日记 (快去偷看!)'});
                }
            }
        } catch(e) {
            console.error('Couple AI Activity Error', e);
        }
    }

    async generateActivity() {
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');

        let char = window.System.currentCheckedFriend;
        
        // If not in phone check mode, use current partner
        if(!char) {
            const data = this.store.get();
            if(data.currentPartnerId) {
                const qqData = JSON.parse(localStorage.getItem('qq_data'));
                char = qqData.friends.find(f => f.id === data.currentPartnerId);
            }
        }

        if(!char) return alert('请先绑定情侣关系');

        const btn = document.getElementById('cpGenActivityBtn') || document.getElementById('cpNormalGenBtn');
        if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // 0: Note, 1: Diary
        const action = Math.random() > 0.5 ? 0 : 1;

        // Inject Global Memory
        const globalContext = window.MemoryManager.getGlobalContext();
        const memoryPrompt = `\n[最近发生的事]:\n${globalContext.recentChats.join('\n')}\n请根据这些近期聊天内容，生成相关的动态。\n`;

        try {
            if(action === 0) {
                const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n${memoryPrompt}\n请在情侣空间的碎碎念板上写一句话。`;
                const content = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
                
                const data = this.store.get();
                let partnerId = data.currentPartnerId;
                
                // In Phone Check Mode, we might need to mock
                if(!partnerId && window.System.isPhoneCheckMode) {
                     alert('生成成功 (需先绑定关系才能看到)');
                } else {
                    this.store.update(d => {
                        const r = d.relationships[partnerId];
                        if(r) {
                            r.notes.unshift({
                                id: Date.now(),
                                senderId: char.id, // Use char.id instead of 'user' to be correct
                                content: content,
                                time: Date.now()
                            });
                        }
                    });
                    if(document.getElementById('noteBoardPage').style.display !== 'none') this.renderNotes();
                    alert('已发布碎碎念');
                }
            } else {
                const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n${memoryPrompt}\n请写一篇简短的情侣日记。`;
                const content = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
                
                const data = this.store.get();
                let partnerId = data.currentPartnerId;
                
                if(partnerId) {
                    this.store.update(d => {
                        const r = d.relationships[partnerId];
                        if(r) {
                            r.diaries.unshift({
                                id: Date.now(),
                                senderId: char.id,
                                content: content,
                                time: Date.now()
                            });
                        }
                    });
                    if(document.getElementById('diaryPage').style.display !== 'none') this.renderDiaries();
                    alert('已发布日记');
                } else {
                    alert('生成成功 (需先绑定关系才能看到)');
                }
            }
            
            // Sync Activity
            if(Math.random() > 0.5) {
                if(Notification.permission === 'granted') {
                    new Notification(char.name, { body: '在情侣空间有了新动态' });
                }
            }

        } catch(e) {
            console.error(e);
            alert('生成失败');
        } finally {
            if(btn) btn.innerHTML = '<i class="fas fa-magic"></i>';
        }
    }
}

window.CoupleApp = new CoupleApp();
