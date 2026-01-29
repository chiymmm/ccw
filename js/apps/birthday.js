class BirthdayStore {
    constructor() { this.init(); }
    init() {
        if(!localStorage.getItem('birthday_data')) {
            const initialData = {
                gifts: [], // {id, name, desc, sender, time}
                wishes: [] // {id, content, time, status: 'pending'|'fulfilled'}
            };
            localStorage.setItem('birthday_data', JSON.stringify(initialData));
        }
    }
    get() { return JSON.parse(localStorage.getItem('birthday_data')); }
    set(data) { localStorage.setItem('birthday_data', JSON.stringify(data)); }
    update(fn) { const data = this.get(); fn(data); this.set(data); }
}

class BirthdayApp {
    constructor() {
        this.store = new BirthdayStore();
        this.initUI();
        this.checkBirthday();
    }

    initUI() {
        const closeBtn = document.getElementById('closeBirthdayApp');
        if(closeBtn) closeBtn.onclick = () => window.showPage('homeScreen');

        document.getElementById('saveBirthdayBtn').onclick = () => {
            const date = document.getElementById('birthdayInput').value;
            if(date) {
                localStorage.setItem('birthday_date', date);
                this.checkBirthday();
            }
        };

        document.getElementById('startPartyBtn').onclick = () => this.startParty();
        document.getElementById('skipCakeBtn').onclick = () => {
            document.getElementById('cakeSection').style.display = 'none';
            document.getElementById('friendSelectSection').style.display = 'block';
            this.renderFriendSelector();
        };
        
        document.getElementById('startCelebrationBtn').onclick = () => this.startCelebration();
        document.getElementById('openGiftBtn').onclick = () => this.openGift();

        // Add Gift Cabinet and Wishing Well buttons to Countdown Page
        const countdownPage = document.getElementById('birthdayCountdown');
        if(countdownPage && !document.getElementById('btnGiftCabinet')) {
            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'position:absolute; bottom:50px; width:100%; display:flex; justify-content:center; gap:20px;';
            
            const giftBtn = document.createElement('button');
            giftBtn.id = 'btnGiftCabinet';
            giftBtn.className = 'action-btn secondary';
            giftBtn.innerText = '🎁 礼物柜';
            giftBtn.onclick = () => this.openGiftCabinet();
            
            const wishBtn = document.createElement('button');
            wishBtn.id = 'btnWishingWell';
            wishBtn.className = 'action-btn secondary';
            wishBtn.innerText = '✨ 许愿池';
            wishBtn.onclick = () => this.openWishingWell();
            
            btnContainer.appendChild(giftBtn);
            btnContainer.appendChild(wishBtn);
            countdownPage.appendChild(btnContainer);
        }
    }

    checkBirthday() {
        const bdayStr = localStorage.getItem('birthday_date');
        if(!bdayStr) {
            this.showPage('birthdaySetup');
            return;
        }

        const today = new Date();
        const bday = new Date(bdayStr);
        
        // Check if today is birthday (ignore year)
        if(today.getMonth() === bday.getMonth() && today.getDate() === bday.getDate()) {
            this.showPage('birthdayParty');
            this.initParty();
        } else {
            this.showPage('birthdayCountdown');
            this.startCountdown(bday);
        }
    }


    showPage(id) {
        document.querySelectorAll('.birthday-page').forEach(el => el.style.display = 'none');
        document.getElementById(id).style.display = 'flex';
    }

    startCountdown(bday) {
        const update = () => {
            const now = new Date();
            let nextBday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
            if(now > nextBday) nextBday.setFullYear(now.getFullYear() + 1);
            
            const diff = nextBday - now;
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            
            document.getElementById('countdownDays').innerText = days;
        };
        update();
        // Simple check every minute
        setInterval(update, 60000);
    }

    initParty() {
        // Play song (simulated)
        console.log('Playing Happy Birthday Song...');
        // Generate Letter
        this.generateLetter();
    }

    async generateLetter() {
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
        const friends = qqData.friends || [];
        if(friends.length === 0) return;

        // Find most chatted friend (simplified: random or first)
        const bestFriend = friends[0]; 
        
        // Inject Global Memory
        const globalContext = window.MemoryManager.getGlobalContext();
        const memoryPrompt = `\n[最近发生的事]:\n${globalContext.recentChats.join('\n')}\n请根据这些近期聊天内容，写一封感人的生日信。\n`;

        const prompt = `你扮演 ${bestFriend.name}。\n人设: ${bestFriend.persona}\n${memoryPrompt}\n今天是用户的生日，请写一封感人的生日信给用户。要求：真诚、温暖、符合人设，不要太长。`;
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        
        if(apiConfig.chatApiKey) {
            try {
                const letter = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
                document.getElementById('birthdayLetter').innerText = letter;
                document.getElementById('letterSection').style.display = 'block';
            } catch(e) {
                console.error(e);
                document.getElementById('birthdayLetter').innerText = "生日快乐！(AI 生成失败)";
            }
        } else {
            document.getElementById('birthdayLetter').innerText = "生日快乐！请配置 API Key 以获取 AI 的祝福。";
            document.getElementById('letterSection').style.display = 'block';
        }
    }

    startParty() {
        document.getElementById('letterSection').style.display = 'none';
        document.getElementById('cakeSection').style.display = 'flex';
        
        // Cake Game Logic
        const cake = document.getElementById('cakeBase');
        const flame = document.getElementById('candleFlame');
        let clicks = 0;
        cake.onclick = () => {
            clicks++;
            if(clicks >= 5) {
                flame.classList.add('lit');
                setTimeout(() => {
                    alert('蜡烛点燃了！许个愿吧！');
                    setTimeout(() => {
                        document.getElementById('cakeSection').style.display = 'none';
                        document.getElementById('friendSelectSection').style.display = 'block';
                        this.renderFriendSelector();
                    }, 1000);
                }, 500);
            }
        };
    }

    renderFriendSelector() {
        const list = document.getElementById('friendSelector');
        list.innerHTML = '';
        const friends = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}').friends;
        
        friends.forEach(f => {
            const div = document.createElement('div');
            div.className = 'select-item';
            div.innerHTML = `<div class="select-avatar" style="background-image:url('${f.avatar}')"></div><span>${f.name}</span>`;
            div.onclick = () => {
                div.classList.toggle('selected');
                if(div.classList.contains('selected')) div.dataset.selected = 'true';
                else delete div.dataset.selected;
            };
            div.dataset.id = f.id;
            list.appendChild(div);
        });
    }

    async startCelebration() {
        const selectedEls = document.querySelectorAll('.select-item.selected');
        const selectedIds = Array.from(selectedEls).map(el => el.dataset.id);
        
        if(selectedIds.length === 0) return alert('请至少选择一个好友');
        
        this.selectedFriendIds = selectedIds; // Store for gift generation

        document.getElementById('friendSelectSection').style.display = 'none';
        document.getElementById('dialogueSection').style.display = 'block';
        
        const dialogueBox = document.getElementById('birthdayDialogue');
        dialogueBox.innerHTML = '正在生成对话...';

        const qqData = JSON.parse(localStorage.getItem('qq_data'));
        const friends = qqData.friends.filter(f => selectedIds.includes(f.id));
        
        // Inject Global Memory
        const globalContext = window.MemoryManager.getGlobalContext();
        const memoryPrompt = `\n[最近发生的事]:\n${globalContext.recentChats.join('\n')}\n请根据这些近期聊天内容，生成相关的庆祝对话。\n`;

        const roles = friends.map(f => `${f.name}(${f.persona})`).join('\n');
        const prompt = `今天是用户的生日。\n参与角色:\n${roles}\n${memoryPrompt}\n请生成一段这些角色为用户庆祝生日的对话。可以是温馨的祝福，也可以是修罗场（如果角色性格冲突）。请用剧本格式输出，包含动作描写。`;
        
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        if(apiConfig.chatApiKey) {
            try {
                const dialogue = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
                dialogueBox.innerText = dialogue;
                document.getElementById('giftSection').style.display = 'block';
            } catch(e) {
                dialogueBox.innerText = "生成失败";
            }
        } else {
            dialogueBox.innerText = "请配置 API Key";
            document.getElementById('giftSection').style.display = 'block';
        }
    }

    async openGift() {
        const giftBox = document.getElementById('giftBox');
        giftBox.style.animation = 'none';
        // Simple open animation
        giftBox.querySelector('.gift-lid').style.transform = 'translateY(-50px) rotate(-20deg)';
        
        // Confetti
        for(let i=0; i<50; i++) {
            const c = document.createElement('div');
            c.className = 'confetti';
            c.style.left = Math.random() * 100 + '%';
            c.style.backgroundColor = `hsl(${Math.random()*360}, 100%, 50%)`;
            c.style.animationDuration = (Math.random() * 2 + 1) + 's';
            document.getElementById('birthdayParty').appendChild(c);
        }

        // Generate Gift Content
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        let giftDesc = '满满的爱！';
        let senderName = '大家';
        
        if(apiConfig.chatApiKey) {
            let prompt = `请生成一个虚拟的生日礼物描述，富有创意和心意。直接输出礼物名称和简短描述。`;
            
            // Incorporate selected friends
            if(this.selectedFriendIds && this.selectedFriendIds.length > 0) {
                const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
                const friends = qqData.friends.filter(f => this.selectedFriendIds.includes(f.id));
                const senders = friends.map(f => `${f.name}(${f.persona})`).join('、');
                senderName = friends.map(f => f.name).join('、');
                prompt = `送礼人是: ${senders}。\n请根据送礼人的人设，生成一份他们会送给用户的生日礼物。描述要具体、符合角色性格。直接输出礼物名称和简短描述。`;
            }

            try {
                giftDesc = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
            } catch(e) { console.error(e); }
        }

        // Save Gift
        this.store.update(d => {
            d.gifts.unshift({
                id: Date.now(),
                name: '生日礼物',
                desc: giftDesc,
                sender: senderName,
                time: Date.now()
            });
        });

        setTimeout(() => {
            // Create a modal to show gift
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.style.background = 'rgba(0,0,0,0.8)';
            modal.innerHTML = `
                <div class="modal-content" style="background:#fff; text-align:center; border-radius:20px; padding:30px;">
                    <div style="font-size:60px; margin-bottom:20px;">🎁</div>
                    <h2 style="color:#ff4d4f;">生日快乐！</h2>
                    <p style="margin:20px 0; font-size:18px; line-height:1.5;">${giftDesc}</p>
                    <button class="action-btn" onclick="window.showPage('homeScreen'); this.closest('.modal').remove();">收下礼物</button>
                </div>
            `;
            document.body.appendChild(modal);
        }, 1000);
    }

    openGiftCabinet() {
        const modal = document.createElement('div');
        modal.className = 'sub-page';
        modal.style.display = 'flex';
        modal.style.background = '#fff';
        
        const data = this.store.get();
        let giftsHtml = '';
        
        if(data.gifts.length === 0) {
            giftsHtml = '<div style="text-align:center;padding:20px;color:#999;">暂无礼物</div>';
        } else {
            data.gifts.forEach(g => {
                giftsHtml += `
                    <div style="padding:15px;border-bottom:1px solid #eee;">
                        <div style="font-weight:bold;">${g.sender} 送的礼物</div>
                        <div style="color:#666;margin:5px 0;">${g.desc}</div>
                        <div style="font-size:12px;color:#999;">${new Date(g.time).toLocaleDateString()}</div>
                    </div>
                `;
            });
        }

        modal.innerHTML = `
            <div class="sub-header">
                <button class="back-btn" onclick="this.closest('.sub-page').remove()"><i class="fas fa-chevron-left"></i></button>
                <span class="sub-title">礼物柜</span>
            </div>
            <div style="flex:1;overflow-y:auto;">${giftsHtml}</div>
        `;
        document.getElementById('birthdayApp').appendChild(modal);
    }

    openWishingWell() {
        const modal = document.createElement('div');
        modal.className = 'sub-page';
        modal.style.display = 'flex';
        modal.style.background = '#e6f7ff';
        
        const data = this.store.get();
        let wishesHtml = '';
        
        data.wishes.forEach(w => {
            wishesHtml += `
                <div style="padding:15px;background:#fff;margin:10px;border-radius:10px;box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <div>${w.content}</div>
                    <div style="font-size:12px;color:#999;margin-top:5px;">${new Date(w.time).toLocaleDateString()} · ${w.status === 'fulfilled' ? '已实现' : '许愿中'}</div>
                </div>
            `;
        });

        modal.innerHTML = `
            <div class="sub-header" style="background:transparent;">
                <button class="back-btn" onclick="this.closest('.sub-page').remove()"><i class="fas fa-chevron-left"></i></button>
                <span class="sub-title">许愿池</span>
                <i class="fas fa-plus" id="addWishBtn" style="cursor:pointer;"></i>
            </div>
            <div style="flex:1;overflow-y:auto;">${wishesHtml}</div>
        `;
        document.getElementById('birthdayApp').appendChild(modal);
        
        modal.querySelector('#addWishBtn').onclick = () => {
            const content = prompt('许个愿吧：');
            if(content) {
                this.store.update(d => {
                    d.wishes.unshift({
                        id: Date.now(),
                        content,
                        time: Date.now(),
                        status: 'pending'
                    });
                });
                alert('许愿成功！AI 会记住你的愿望。');
                modal.remove();
                this.openWishingWell();
            }
        };
    }
}

window.BirthdayApp = new BirthdayApp();
