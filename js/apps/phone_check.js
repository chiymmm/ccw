class PhoneCheckApp {
    constructor() {
        this.initUI();
        // Check if we are in phone check mode (e.g. after refresh)
        if(localStorage.getItem('is_phone_check_mode') === 'true') {
            setTimeout(() => this.showExitButton(), 500);
        }
    }

    initUI() {
        // No specific UI init needed for now, rendered on open
    }

    async render() {
        const container = document.getElementById('phoneCheckApp');
        container.innerHTML = `
            <div class="pc-header">
                <span>选择角色查看手机</span>
                <i class="fas fa-plus" id="pcGenBtn" style="cursor:pointer;"></i>
            </div>
            <div id="pcList" class="pc-list"></div>
            <div id="pcLoading" class="pc-loading" style="display:none;"><i class="fas fa-spinner"></i><span>正在破解系统...</span></div>
        `;
        
        document.getElementById('pcGenBtn').onclick = () => this.generateActivity();

        const list = document.getElementById('pcList');
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        
        if(qqData.friends.length === 0) {
            list.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#666;">暂无角色，请先在QQ添加好友</div>';
            return;
        }

        for(const f of qqData.friends) {
            const div = document.createElement('div');
            div.className = 'pc-item';
            
            let avatar = f.avatar;
            if(avatar && avatar.startsWith('img_')) avatar = await window.db.getImage(avatar);
            
            div.innerHTML = `
                <div class="pc-avatar" style="background-image:url('${avatar}')"></div>
                <div class="pc-name">${f.name}</div>
            `;
            
            div.onclick = () => this.enterPhone(f);
            list.appendChild(div);
        }
    }

    enterPhone(friend) {
        let loading = document.getElementById('pcLoading');
        loading.style.display = 'flex';
        
        // Simulate hacking/entering
        setTimeout(() => {
            loading.style.display = 'none';
            
            try {
                // Switch Context
                window.System.switchContext(friend);
                
                // Force refresh all apps
                if(window.QQApp) { window.QQApp.store.init(); window.QQApp.renderChatList(); }
                if(window.TwitterApp) { window.TwitterApp.store.init(); window.TwitterApp.renderHome(); }
                if(window.InstagramApp) { window.InstagramApp.store.init(); window.InstagramApp.renderHome(); }
                if(window.CoupleApp) { window.CoupleApp.store.init(); window.CoupleApp.render(); }
                if(window.ShopApp) { window.ShopApp.store.init(); }
                if(window.ForumApp) { window.ForumApp.store.init(); }
                if(window.DiaryApp) { window.DiaryApp.store.init(); }
                if(window.AppUsageApp) { window.AppUsageApp.store.init(); }
                
                // Override Icons for Phone Check Mode
                this.overrideIcons();

                // Go to Home Screen (of the friend)
                window.showPage('homeScreen');
                
                // Add visual indicator
                const container = document.querySelector('.phone-container');
                if(container) {
                    container.classList.add('phone-check-mode');
                    container.style.border = '4px solid #dc3545';
                    container.style.boxSizing = 'border-box';
                }
                
                // Show a toast
                alert(`已进入 ${friend.name} 的手机`);
                
                // Add an exit button overlay
                this.showExitButton();
            } catch(e) {
                console.error(e);
                alert('进入失败: ' + e.message);
                loading.style.display = 'none';
            }
            
        }, 1500);
    }

    overrideIcons() {
        // Override Fanfic -> Diary
        const fanficIcon = document.getElementById('openFanficBtn');
        if(fanficIcon) {
            const newIcon = fanficIcon.cloneNode(true);
            newIcon.id = 'openFanficBtn';
            newIcon.querySelector('span').textContent = '备忘录';
            newIcon.querySelector('i').className = 'fas fa-book-medical';
            newIcon.onclick = (e) => {
                e.stopPropagation();
                window.showPage('fanficApp'); // Reuse container but render Diary
                if(window.DiaryApp) window.DiaryApp.render();
            };
            fanficIcon.parentNode.replaceChild(newIcon, fanficIcon);
        }

        // Override Birthday -> App Usage
        const birthdayIcon = document.getElementById('openBirthdayBtn');
        if(birthdayIcon) {
            const newIcon = birthdayIcon.cloneNode(true);
            newIcon.id = 'openBirthdayBtn';
            newIcon.querySelector('span').textContent = 'APP记录';
            newIcon.querySelector('i').className = 'fas fa-chart-bar';
            newIcon.onclick = (e) => {
                e.stopPropagation();
                window.showPage('birthdayApp'); // Reuse container but render AppUsage
                if(window.AppUsageApp) window.AppUsageApp.render();
            };
            birthdayIcon.parentNode.replaceChild(newIcon, birthdayIcon);
        }

        // Add extra apps for Phone Check (SMS, Photos, Browser)
        // We can reuse existing slots or add new ones dynamically
        // For simplicity, let's just add them to the home screen if not present
        const homeScreen = document.getElementById('homeScreen');
        if(!document.getElementById('pcExtraApps')) {
            const row = document.createElement('div');
            row.id = 'pcExtraApps';
            row.className = 'row-container';
            row.innerHTML = `
                <div class="app-group">
                    <div class="app-icon" onclick="alert('短信功能开发中')"><div class="app-icon-inner" style="background:#4cd964;"><i class="fas fa-comment-alt"></i></div><span>短信</span></div>
                    <div class="app-icon" onclick="alert('相册功能开发中')"><div class="app-icon-inner" style="background:linear-gradient(45deg, #ffcc00, #ff9500);"><i class="fas fa-images"></i></div><span>相册</span></div>
                    <div class="app-icon" onclick="alert('浏览器功能开发中')"><div class="app-icon-inner" style="background:#007aff;"><i class="fas fa-compass"></i></div><span>浏览器</span></div>
                    <div class="app-icon" onclick="alert('通话记录开发中')"><div class="app-icon-inner" style="background:#4cd964;"><i class="fas fa-phone-alt"></i></div><span>电话</span></div>
                </div>
            `;
            // Insert before the last row (dock is separate)
            homeScreen.insertBefore(row, homeScreen.lastElementChild);
        }
    }

    restoreIcons() {
        // Restore Fanfic
        const fanficIcon = document.getElementById('openFanficBtn');
        if(fanficIcon) {
            const newIcon = fanficIcon.cloneNode(true);
            newIcon.querySelector('span').textContent = '同人墙';
            newIcon.querySelector('i').className = 'fas fa-pen-nib';
            newIcon.onclick = () => {
                window.showPage('fanficApp');
                if(window.FanficApp) window.FanficApp.renderList();
            };
            fanficIcon.parentNode.replaceChild(newIcon, fanficIcon);
        }

        // Restore Birthday
        const birthdayIcon = document.getElementById('openBirthdayBtn');
        if(birthdayIcon) {
            const newIcon = birthdayIcon.cloneNode(true);
            newIcon.querySelector('span').textContent = '生日快乐';
            newIcon.querySelector('i').className = 'fas fa-birthday-cake';
            newIcon.onclick = () => {
                window.showPage('birthdayApp');
                if(window.BirthdayApp) window.BirthdayApp.checkBirthday();
            };
            birthdayIcon.parentNode.replaceChild(newIcon, birthdayIcon);
        }

        // Remove extra apps
        const extra = document.getElementById('pcExtraApps');
        if(extra) extra.remove();
    }

    showExitButton() {
        if(document.getElementById('pcExitBtn')) return;
        
        // Add visual indicator for phone check mode (in case of refresh)
        const container = document.querySelector('.phone-container');
        if(container) {
            container.classList.add('phone-check-mode');
            container.style.border = '4px solid #dc3545';
            container.style.boxSizing = 'border-box';
        }

        const btn = document.createElement('div');
        btn.id = 'pcExitBtn';
        // Increased z-index and added shadow/border for better visibility
        btn.style.cssText = 'position:fixed; top:60px; right:20px; background:rgba(220,53,69,0.9); color:white; padding:8px 15px; border-radius:25px; font-size:14px; z-index:100001; cursor:pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 2px solid white; font-weight:bold; display:flex; align-items:center; gap:5px;';
        btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> 退出查看';
        btn.onclick = () => {
            window.System.resetContext();
            // No need to manually restore icons or remove btn as resetContext reloads the page
        };
        document.body.appendChild(btn);
    }

    async generateActivity() {
        const apiConfig = window.API.getConfig();
        if(!apiConfig.chatApiKey) return alert('请先配置 API Key');
        
        const btn = document.getElementById('pcGenBtn');
        btn.className = 'fas fa-spinner fa-spin';
        
        const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
        if(qqData.friends.length === 0) {
            btn.className = 'fas fa-plus';
            return alert('暂无角色');
        }
        
        const char = qqData.friends[Math.floor(Math.random() * qqData.friends.length)];
        
        // Inject Global Memory
        const globalContext = window.MemoryManager.getGlobalContext();
        const memoryPrompt = `\n[最近发生的事]:\n${globalContext.recentChats.join('\n')}\n请根据这些近期聊天内容，生成相关的手机活动。\n`;

        const prompt = `你扮演 ${char.name}。\n人设: ${char.persona}\n${memoryPrompt}\n请生成一个你正在进行的手机活动。\n例如：在QQ和谁聊天、在刷推特看什么、在备忘录写什么、在听什么歌。\n返回 JSON: {"app": "QQ/Twitter/Instagram/Music/Diary", "activity": "活动描述"}`;
        
        try {
            const res = await window.API.callAI([{role:'system', content:prompt}], apiConfig);
            const act = JSON.parse(res);
            
            alert(`${char.name} 正在 ${act.app}: ${act.activity}`);
            
            // Trigger actual app generation if possible
            if(act.app === 'QQ' && window.QQApp) window.QQApp.generateActivity();
            else if(act.app === 'Twitter' && window.TwitterApp) window.TwitterApp.generateActivity();
            else if(act.app === 'Instagram' && window.InstagramApp) window.InstagramApp.generateActivity();
            
        } catch(e) { alert('生成失败'); }
        finally { btn.className = 'fas fa-plus'; }
    }
}

window.PhoneCheckApp = new PhoneCheckApp();
