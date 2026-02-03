document.addEventListener('DOMContentLoaded', () => {
    // 自定义模型输入框显示逻辑
const imageModelSelect = document.getElementById('imageModelSelect');
const imageModelCustom = document.getElementById('imageModelCustom');
if (imageModelSelect && imageModelCustom) {
    imageModelSelect.addEventListener('change', (e) => {
        imageModelCustom.style.display = e.target.value === 'custom' ? 'block' : 'none';
    });
}

// Steps 滑块实时显示
const imageStepsSlider = document.getElementById('imageSteps');
const stepsValueDisplay = document.getElementById('stepsValue');
if (imageStepsSlider && stepsValueDisplay) {
    imageStepsSlider.addEventListener('input', (e) => {
        stepsValueDisplay.textContent = e.target.value;
    });
}

// CFG 滑块实时显示
const imageCfgSlider = document.getElementById('imageCfg');
const cfgValueDisplay = document.getElementById('cfgValue');
if (imageCfgSlider && cfgValueDisplay) {
    imageCfgSlider.addEventListener('input', (e) => {
        cfgValueDisplay.textContent = e.target.value;
    });
}

        // ★★★ 全局模态框状态清理 ★★★
window.cleanupModals = () => {
    const modalIds = ['settingsModal', 'historyModal', 'actionSheet'];

    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
            // 完全清空inline样式
            modal.style.cssText = 'display: none;';
            modal.classList.remove('active', 'show', 'open');

            // 移除可能的事件锁定
            modal.style.pointerEvents = '';
        }
    });

    // 清理body上可能的滚动锁定
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
};


    // 页面可见性变化时清理
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // 延迟清理确保状态稳定
            setTimeout(window.cleanupModals, 100);
        }
    });

    // 监听返回手势/悬浮球（如果有全局事件）
    window.addEventListener('popstate', window.cleanupModals);

    // ==========================================
    // System Features & Desktop Logic
    // ==========================================
    // 温度滑块实时显示数值
const apiTemperatureSlider = document.getElementById('apiTemperature');
const temperatureValueDisplay = document.getElementById('temperatureValue');
if (apiTemperatureSlider && temperatureValueDisplay) {
    apiTemperatureSlider.addEventListener('input', (e) => {
        temperatureValueDisplay.textContent = e.target.value;
    });
}

    // 1. Clock
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}:${seconds}`;
        
        const clockEl = document.getElementById('clock');
        if(clockEl) clockEl.textContent = timeStr;
        
        // Sync other clocks
        document.querySelectorAll('.sync-clock').forEach(el => el.textContent = timeStr);
    }
    setInterval(updateClock, 1000);
    updateClock();

    // 2. Battery
    let currentBattery = { level: 1, charging: false };

    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            currentBattery = battery;
            updateBattery();
            battery.addEventListener('levelchange', () => updateBattery());
            battery.addEventListener('chargingchange', () => updateBattery());
        }).catch(e => console.log('Battery API error:', e));
    }

    function updateBattery() {
        const level = Math.round(currentBattery.level * 100);
        const text = `${level}%${currentBattery.charging ? ' ⚡' : ''}`;
        const color = level <= 20 ? '#ff4d4f' : 'inherit';

        const batteryEl = document.querySelector('.battery-level');
        if (batteryEl) {
            batteryEl.textContent = text;
            batteryEl.style.color = color;
        }
        
        // Sync other batteries
        document.querySelectorAll('.sync-battery').forEach(el => {
            el.textContent = text;
            el.style.color = color;
        });
    }
    
    // Expose for manual update if needed
    window.updateSystemStatus = () => {
        updateClock();
        updateBattery();
    };

    // 3. Todo
    const todoList = document.getElementById('todoList');
    const addTodoBtn = document.getElementById('addTodoBtn');
    const historyBtn = document.getElementById('historyBtn');
    const historyModal = document.getElementById('historyModal');
    const closeHistory = document.getElementById('closeHistory');
    const historyList = document.getElementById('historyList');
    
    let todos = [];
    let todoHistory = [];

    try {
        const storedTodos = localStorage.getItem('todos');
        if (storedTodos) todos = JSON.parse(storedTodos);
        const storedHistory = localStorage.getItem('todoHistory');
        if (storedHistory) todoHistory = JSON.parse(storedHistory);
    } catch (e) { console.error('Data load error', e); }

    if (!Array.isArray(todos) || (todos.length === 0 && !localStorage.getItem('todos'))) {
        todos = [
            { text: '买牛奶', completed: false, createdAt: Date.now() },
            { text: '看书', completed: false, createdAt: Date.now() },
            { text: '发呆', completed: true, createdAt: Date.now(), completedAt: Date.now() }
        ];
    }

    function checkAndArchiveTodos() {
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        let archiveThreshold = todayStart;
        let hasChanges = false;
        for (let i = todos.length - 1; i >= 0; i--) {
            const todo = todos[i];
            if (todo.completed && todo.completedAt) {
                if (new Date(todo.completedAt) < archiveThreshold) {
                    todoHistory.push(todo);
                    todos.splice(i, 1);
                    hasChanges = true;
                }
            }
        }
        if (hasChanges) { saveTodos(); saveHistory(); }
    }
    checkAndArchiveTodos();
    setInterval(checkAndArchiveTodos, 60000);

    function renderTodos() {
        if (!todoList) return;
        todoList.innerHTML = '';
        todos.forEach((todo, index) => {
            const li = document.createElement('li');
            if (todo.completed) li.classList.add('completed');
            li.innerHTML = `<span class="check"></span><span>${todo.text}</span>`;
            li.addEventListener('click', () => {
                todos[index].completed = !todos[index].completed;
                if (todos[index].completed) todos[index].completedAt = Date.now();
                else delete todos[index].completedAt;
                saveTodos(); renderTodos();
            });
            let pressTimer;
            const startDelete = () => { pressTimer = setTimeout(() => { if(confirm('删除这条待办吗？')) { todos.splice(index, 1); saveTodos(); renderTodos(); } }, 800); };
            const endDelete = () => clearTimeout(pressTimer);
            li.addEventListener('mousedown', startDelete);
            li.addEventListener('mouseup', endDelete);
            li.addEventListener('mouseleave', endDelete);
            li.addEventListener('touchstart', startDelete);
            li.addEventListener('touchend', endDelete);
            todoList.appendChild(li);
        });
    }

    function renderHistory() {
        if (!historyList) return;
        historyList.innerHTML = '';
        if (todoHistory.length === 0) { historyList.innerHTML = '<div style="text-align:center; color:#999;">暂无历史记录</div>'; return; }
        const groups = {};
        todoHistory.forEach(todo => {
            const date = new Date(todo.completedAt || todo.createdAt || Date.now());
            const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(todo);
        });
        const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
        sortedDates.forEach(date => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'history-group';
            const h4 = document.createElement('h4');
            h4.textContent = date;
            groupDiv.appendChild(h4);
            const ul = document.createElement('ul');
            groups[date].forEach(todo => {
                const li = document.createElement('li');
                li.className = 'completed';
                li.innerHTML = `<i class="fas fa-check-circle status-icon"></i><span>${todo.text}</span>`;
                ul.appendChild(li);
            });
            groupDiv.appendChild(ul);
            historyList.appendChild(groupDiv);
        });
    }

    function saveTodos() { localStorage.setItem('todos', JSON.stringify(todos)); }
    function saveHistory() { localStorage.setItem('todoHistory', JSON.stringify(todoHistory)); }

    if (addTodoBtn) addTodoBtn.addEventListener('click', (e) => { e.stopPropagation(); const text = prompt('添加新待办:'); if (text && text.trim()) { todos.push({ text: text.trim(), completed: false, createdAt: Date.now() }); saveTodos(); renderTodos(); } });
    if (historyBtn) historyBtn.addEventListener('click', (e) => { e.stopPropagation(); historyModal.style.display = 'flex'; renderHistory(); });
    if (closeHistory) closeHistory.addEventListener('click', () => historyModal.style.display = 'none');
    renderTodos();

    // Todo Widget Background
    const todoWidget = document.getElementById('todoWidget');
    const todoUpload = document.getElementById('todoUpload');
    if (todoWidget && todoUpload) {
        todoWidget.addEventListener('click', (e) => {
            if (e.target.closest('.todo-list') || e.target.closest('.add-btn') || e.target.closest('.icon-btn')) return;
            todoUpload.click();
        });
        todoUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    // 使用 DB 存储大图
                    const id = await window.db.saveImage(e.target.result);
                    await window.db.saveData('todoBgId', id);
                    todoWidget.style.backgroundImage = `url(${e.target.result})`;
                    todoWidget.style.boxShadow = 'inset 0 0 0 200px rgba(255,255,255,0.5), 5px 5px 0px #000';
                };
                reader.readAsDataURL(file);
            }
        });
        // Load saved bg
        window.db.getData('todoBgId').then(async id => {
            if(id) {
                const data = await window.db.getImage(id);
                if(data) {
                    todoWidget.style.backgroundImage = `url(${data})`;
                    todoWidget.style.boxShadow = 'inset 0 0 0 200px rgba(255,255,255,0.5), 5px 5px 0px #000';
                }
            }
        });
    }

    // 4. Squeeze Widget
    const squeezeWidget = document.getElementById('squeezeWidget');
    const squeezeUpload = document.getElementById('squeezeUpload');
    const squeezeText = document.getElementById('squeezeText');
    const squeezeImg = document.getElementById('squeezeImg');
    const squeezePhrases = ['( > 3 < )', '( ^ o ^ )', '( T _ T )', '( O . O )', '( = w = )'];
    let phraseIndex = 0;

    if (squeezeWidget) {
        squeezeWidget.onclick = () => {
            if (navigator.vibrate) navigator.vibrate(50);
            
            if (window.QQApp && window.QQApp.showActionSheet) {
                window.QQApp.showActionSheet([
                    {
                        text: '切换表情',
                        handler: () => {
                            phraseIndex = (phraseIndex + 1) % squeezePhrases.length;
                            if(squeezeText) squeezeText.textContent = squeezePhrases[phraseIndex];
                        }
                    },
                    {
                        text: '更换图片',
                        handler: () => {
                            if(squeezeUpload) squeezeUpload.click();
                        }
                    }
                ]);
            } else {
                phraseIndex = (phraseIndex + 1) % squeezePhrases.length;
                if(squeezeText) squeezeText.textContent = squeezePhrases[phraseIndex];
            }
        };
    }

    if (squeezeUpload) {
        squeezeUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const compressed = await window.Utils.compressImage(e.target.result);
                    if (squeezeImg) { squeezeImg.src = compressed; squeezeImg.style.display = 'block'; }
                    if (squeezeText) squeezeText.style.display = 'none';
                    if (squeezeWidget) { squeezeWidget.style.backgroundColor = 'transparent'; }
                    
                    const id = await window.db.saveImage(compressed);
                    await window.db.saveData('squeezeImgId', id);
                };
                reader.readAsDataURL(file);
            }
        });
        
        window.db.getData('squeezeImgId').then(async id => {
            if(id) {
                const data = await window.db.getImage(id);
                if(data && squeezeImg) {
                    squeezeImg.src = data;
                    squeezeImg.style.display = 'block';
                    if(squeezeText) squeezeText.style.display = 'none';
                    if(squeezeWidget) { squeezeWidget.style.backgroundColor = 'transparent'; }
                }
            }
        });
    }

// ==========================================
// Settings Modal Logic (修复版)
// ==========================================
const settingsApp = document.getElementById('settingsApp');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');

// 打开设置
if (settingsApp) {
    settingsApp.addEventListener('click', (e) => {
        e.stopPropagation();

        const modal = document.getElementById('settingsModal');
        if (!modal) return;

        // ★★★ 打开前完全重置状态 ★★★
        modal.style.cssText = '';  // 清空所有inline样式
        modal.offsetHeight;        // 强制重排(flush)

        // 重新设置显示
        modal.style.display = 'flex';
        modal.style.zIndex = '9999';
        modal.style.position = 'absolute';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.background = 'rgba(0,0,0,0.5)';

        setTimeout(() => {
            try {
                loadSettings();
                if (typeof renderAppList === 'function') renderAppList();
            } catch (err) {
                console.error('设置加载错误:', err);
            }
        }, 50);
    });
}


// 关闭设置 - 点击X按钮
if (closeSettings) {
    closeSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        if (settingsModal) {
            settingsModal.style.cssText = 'display: none;';
        }
    });
}

// 关闭设置 - 点击背景遮罩
if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
        // 只有点击遮罩层本身才关闭点击内容区域不关闭
        if (e.target === settingsModal) {
            settingsModal.style.cssText = 'display: none;';
        }
    });
}

    // God Mode UI Injection
    if(!document.getElementById('godModeSection')) {
        const modalBody = settingsModal.querySelector('.modal-body');
        const godSection = document.createElement('div');
        godSection.id = 'godModeSection';
        godSection.className = 'setting-section';
        godSection.innerHTML = `
            <h3><i class="fas fa-crown"></i> 上帝模式 (God Mode)</h3>
            <div class="sub-section">
                <label>数据修改</label>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <button class="action-btn secondary" id="godEditQQ">修改 QQ 数据</button>
                    <button class="action-btn secondary" id="godEditTwitter">修改 X 数据</button>
                    <button class="action-btn secondary" id="godEditIns">修改 Ins 数据</button>
                    <button class="action-btn secondary" id="godEditCouple">修改情侣数据</button>
                </div>
            </div>
            <div class="sub-section">
                <label>世界观设定</label>
                <textarea id="godWorldSetting" placeholder="设定全局世界观，例如：这是一个魔法世界..." rows="3" style="width:100%; border:1.5px solid #333; border-radius:10px; padding:5px;"></textarea>
                <button class="action-btn secondary" id="godSaveWorld">保存世界观</button>
            </div>
        `;
        modalBody.appendChild(godSection);

        // God Mode Handlers
        document.getElementById('godEditQQ').onclick = () => {
            const data = JSON.parse(localStorage.getItem('qq_data') || '{}');
            if(!data.wallet) data.wallet = {balance: 0, history: []};
            const newBalance = prompt('修改钱包余额:', data.wallet.balance);
            if(newBalance !== null) {
                data.wallet.balance = newBalance;
                localStorage.setItem('qq_data', JSON.stringify(data));
                alert('修改成功');
            }
        };

        document.getElementById('godEditTwitter').onclick = () => {
            const data = JSON.parse(localStorage.getItem('twitter_data') || '{}');
            const account = data.accounts.find(a => a.id === data.currentAccountId);
            if(account) {
                const newFollowers = prompt('修改粉丝数:', account.followers);
                if(newFollowers !== null) {
                    account.followers = newFollowers;
                    localStorage.setItem('twitter_data', JSON.stringify(data));
                    alert('修改成功');
                }
            }
        };

        document.getElementById('godEditIns').onclick = () => {
            const data = JSON.parse(localStorage.getItem('instagram_data') || '{}');
            const newFollowers = prompt('修改粉丝数:', data.profile.followers);
            if(newFollowers !== null) {
                data.profile.followers = newFollowers;
                localStorage.setItem('instagram_data', JSON.stringify(data));
                alert('修改成功');
            }
        };

        document.getElementById('godEditCouple').onclick = () => {
            const data = JSON.parse(localStorage.getItem('couple_data') || '{}');
            const newDate = prompt('修改在一起的开始日期 (YYYY-MM-DD):', new Date(data.startDate).toISOString().split('T')[0]);
            if(newDate) {
                data.startDate = new Date(newDate).getTime();
                localStorage.setItem('couple_data', JSON.stringify(data));
                alert('修改成功');
            }
        };

        document.getElementById('godSaveWorld').onclick = () => {
            const setting = document.getElementById('godWorldSetting').value;
            localStorage.setItem('world_setting', setting);
            alert('世界观已保存，所有 AI 将遵循此设定。');
        };
        
        // Load World Setting
        const savedWorld = localStorage.getItem('world_setting');
        if(savedWorld) document.getElementById('godWorldSetting').value = savedWorld;
    }

function loadSettings() {
    // 1. 安全加载 API 配置
    try {
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el && val !== undefined && val !== null) el.value = val;
        };

        setVal('chatApiUrl', apiConfig.chatApiUrl);
        setVal('chatApiKey', apiConfig.chatApiKey);
        setVal('imageApiUrl', apiConfig.imageApiUrl);
        setVal('imageApiKey', apiConfig.imageApiKey);
        setVal('ttsApiUrl', apiConfig.ttsApiUrl);
        setVal('ttsApiKey', apiConfig.ttsApiKey);
        setVal('customBreakLimit', apiConfig.customBreakLimit);
// 绘画配置加载
setVal('imageApiUrl', apiConfig.imageApiUrl);
setVal('imageApiKey', apiConfig.imageApiKey);
setVal('imageSizeSelect', apiConfig.imageSize);
setVal('imagePromptTemplate', apiConfig.imagePromptTemplate);
setVal('imageNegativePrompt', apiConfig.imageNegativePrompt);
setVal('imageSampler', apiConfig.imageSampler);
setVal('imageNoiseSchedule', apiConfig.imageNoiseSchedule);
setVal('imageSmea', apiConfig.imageSmea);
setVal('imageSeed', apiConfig.imageSeed);

// 模型选择
if (apiConfig.imageModel) {
    const imageModelSelect = document.getElementById('imageModelSelect');
    const imageModelCustom = document.getElementById('imageModelCustom');
    if (imageModelSelect) {
        const existingOption = Array.from(imageModelSelect.options).find(opt => opt.value === apiConfig.imageModel);
        if (existingOption) {
            imageModelSelect.value = apiConfig.imageModel;
        } else {
            imageModelSelect.value = 'custom';
            if (imageModelCustom) {
                imageModelCustom.value = apiConfig.imageModel;
                imageModelCustom.style.display = 'block';
            }
        }
    }
}

// Steps 滑块
const imageStepsSlider = document.getElementById('imageSteps');
const stepsValueDisplay = document.getElementById('stepsValue');
if (imageStepsSlider && stepsValueDisplay) {
    const steps = apiConfig.imageSteps || 28;
    imageStepsSlider.value = steps;
    stepsValueDisplay.textContent = steps;
}

// CFG 滑块
const imageCfgSlider = document.getElementById('imageCfg');
const cfgValueDisplay = document.getElementById('cfgValue');
if (imageCfgSlider && cfgValueDisplay) {
    const cfg = apiConfig.imageCfg || 5;
    imageCfgSlider.value = cfg;
    cfgValueDisplay.textContent = cfg;
}

        // 温度设置
        const tempSlider = document.getElementById('apiTemperature');
        const tempDisplay = document.getElementById('temperatureValue');
        if (tempSlider && tempDisplay) {
            const temp = apiConfig.temperature !== undefined ? apiConfig.temperature : 0.8;
            tempSlider.value = temp;
            tempDisplay.textContent = temp;
        }

        // 模型选择
        if (apiConfig.chatModel) {
            const chatModelSelect = document.getElementById('chatModelSelect');
            if (chatModelSelect) {
                if (!Array.from(chatModelSelect.options).some(opt => opt.value === apiConfig.chatModel)) {
                    const opt = document.createElement('option');
                    opt.value = apiConfig.chatModel;
                    opt.textContent = apiConfig.chatModel;
                    chatModelSelect.appendChild(opt);
                }
                chatModelSelect.value = apiConfig.chatModel;
            }
        }
    } catch (e) {
        console.error('API配置加载失败:', e);
    }

    // 2. 捏捏样式
    try {
        const style = localStorage.getItem('squeezeStyle') || 'default';
        applySqueezeStyle(style);
        document.querySelectorAll('.style-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.style === style);
        });
    } catch (e) {
        console.error('样式加载失败:', e);
    }

    // 3. 活动频率
    try {
        const freq = localStorage.getItem('activityFrequency') || '0';
        const activityFrequency = document.getElementById('activityFrequency');
        if (activityFrequency) activityFrequency.value = freq;
        setupActivityTimer(freq);
    } catch (e) {
        console.error('活动频率加载失败:', e);
    }

    // 4. 通知开关
    try {
        const notifEnabled = localStorage.getItem('notificationsEnabled') === 'true';
        const notificationToggle = document.getElementById('notificationToggle');
        if (notificationToggle) notificationToggle.checked = notifEnabled;
    } catch (e) {
        console.error('通知设置加载失败:', e);
    }

    // 5. ★★★ 壁纸加载（关键修复）★★★
    // 使用延迟加载避免阻塞模态框显示
    setTimeout(async () => {
        try {
            if (window.db && typeof window.db.ready !== 'undefined') {
                await Promise.race([
                    window.db.ready,
                    new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000))
                ]);

                const wallpaperId = await window.db.getData('wallpaperId');
                if (wallpaperId) {
                    const data = await window.db.getImage(wallpaperId);
                    if (data) applyWallpaper(data);
                }
            }
        } catch (e) {
            console.warn('壁纸加载跳过:', e);
        }
    }, 100);

    // 6. 自定义 CSS
    try {
        const customCss = localStorage.getItem('customCss');
        if (customCss) {
            const customCssInput = document.getElementById('customCssInput');
            if (customCssInput) customCssInput.value = customCss;

            let customStyleTag = document.getElementById('custom-css-style');
            if (!customStyleTag) {
                customStyleTag = document.createElement('style');
                customStyleTag.id = 'custom-css-style';
                document.head.appendChild(customStyleTag);
            }
            customStyleTag.textContent = customCss;
        }
    } catch (e) {
        console.error('CSS加载失败:', e);
    }

    // 7. 图标状态
    try {
        loadIconStates();
    } catch (e) {
        console.error('图标状态加载失败:', e);
    }
}


if (closeSettings) {
    closeSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        const modal = document.getElementById('settingsModal');
        if (modal) modal.style.cssText = 'display: none;';
    });
}

// 关闭设置 - 点击背景遮罩
if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
        // 只有点击遮罩层本身才关闭
        if (e.target === settingsModal) {
            settingsModal.style.cssText = 'display: none;';
        }
    });
}





if (closeSettings) {
    closeSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        // ★★★ 完全重置模态框状态 ★★★
        settingsModal.style.cssText = 'display: none;';
    });
}







    const saveApiBtn = document.getElementById('saveApiBtn');
    const fetchModelsBtn = document.getElementById('fetchModelsBtn');
    const chatModelSelect = document.getElementById('chatModelSelect');

    if (fetchModelsBtn) {
        fetchModelsBtn.addEventListener('click', async () => {
            const apiUrl = document.getElementById('chatApiUrl').value;
            const apiKey = document.getElementById('chatApiKey').value;
            if (!apiUrl || !apiKey) return alert('请先填写 API 地址和 Key');
            fetchModelsBtn.textContent = '获取中...';
            try {
                let url = apiUrl;
                if (!url.endsWith('/models')) url = url.endsWith('/') ? `${url}models` : `${url}/models`;
                const response = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}` } });
                if (!response.ok) throw new Error('API 请求失败');
                const data = await response.json();
                const models = data.data || [];
                chatModelSelect.innerHTML = '<option value="">请选择模型</option>';
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.id;
                    chatModelSelect.appendChild(option);
                });
                alert(`成功获取 ${models.length} 个模型`);
            } catch (e) {
                console.error(e);
                const manualModel = prompt('自动获取失败。请输入模型名称 (例如 gpt-3.5-turbo):');
                if (manualModel) chatModelSelect.innerHTML = `<option value="${manualModel}" selected>${manualModel}</option>`;
            } finally { fetchModelsBtn.textContent = '获取模型列表'; }
        });
    }

if (saveApiBtn) {
    saveApiBtn.addEventListener('click', () => {
        // 处理自定义模型
        let imageModel = document.getElementById('imageModelSelect').value;
        if (imageModel === 'custom') {
            imageModel = document.getElementById('imageModelCustom').value || 'nai-diffusion-4-curated-preview';
        }

        const config = {
            chatApiUrl: document.getElementById('chatApiUrl').value,
            chatApiKey: document.getElementById('chatApiKey').value,
            chatModel: document.getElementById('chatModelSelect').value,
            customBreakLimit: document.getElementById('customBreakLimit').value,
            temperature: parseFloat(document.getElementById('apiTemperature').value) || 0.8,

            // 绘画 API 配置
            imageApiUrl: document.getElementById('imageApiUrl').value,
            imageApiKey: document.getElementById('imageApiKey').value,
            imageModel: imageModel,
            imageSize: document.getElementById('imageSizeSelect').value,
            imagePromptTemplate: document.getElementById('imagePromptTemplate').value,
            imageNegativePrompt: document.getElementById('imageNegativePrompt').value,

            // 高级参数
            imageSampler: document.getElementById('imageSampler').value,
            imageSteps: parseInt(document.getElementById('imageSteps').value) || 28,
            imageCfg: parseFloat(document.getElementById('imageCfg').value) || 5,
            imageNoiseSchedule: document.getElementById('imageNoiseSchedule').value,
            imageSmea: document.getElementById('imageSmea').value,
            imageSeed: document.getElementById('imageSeed').value ? parseInt(document.getElementById('imageSeed').value) : null,

            // TTS 配置
            ttsApiUrl: document.getElementById('ttsApiUrl').value,
            ttsApiKey: document.getElementById('ttsApiKey').value
        };
        localStorage.setItem('apiConfig', JSON.stringify(config));
        alert('API 配置已保存！');
    });
}


    const wallpaperBtn = document.getElementById('wallpaperBtn');
    const wallpaperInput = document.getElementById('wallpaperInput');
    const resetWallpaperBtn = document.getElementById('resetWallpaperBtn');
    const phoneContainer = document.querySelector('.phone-container');

if (wallpaperBtn && wallpaperInput) {
    wallpaperBtn.addEventListener('click', () => wallpaperInput.click());

    wallpaperInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 显示加载提示
        wallpaperBtn.textContent = '上传中...';
        wallpaperBtn.disabled = true;

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    // 压缩图片
                    const bgUrl = await window.Utils.compressImage(e.target.result, 1080, 0.85);

                    // 保存到 IndexedDB
                    const id = await window.db.saveImage(bgUrl);
                    await window.db.saveData('wallpaperId', id);

                    // 应用壁纸
                    applyWallpaper(bgUrl);

                    alert('壁纸设置成功！');
                } catch (err) {
                    alert('壁纸保存失败：' + err.message);
                    console.error('壁纸保存错误:', err);
                } finally {
                    wallpaperBtn.textContent = '更换壁纸';
                    wallpaperBtn.disabled = false;
                }
            };

            reader.onerror = () => {
                alert('文件读取失败');
                wallpaperBtn.textContent = '更换壁纸';
                wallpaperBtn.disabled = false;
            };

            reader.readAsDataURL(file);
        } catch (err) {
            alert('上传失败：' + err.message);
            console.error(err);
            wallpaperBtn.textContent = '更换壁纸';
            wallpaperBtn.disabled = false;
        }
    });
}

    if (resetWallpaperBtn) resetWallpaperBtn.addEventListener('click', async () => { 
        await window.db.deleteData('wallpaperId');
        phoneContainer.style.backgroundImage = ''; 
    });
function applyWallpaper(url) {
    if (!url) return;

    const phoneContainer = document.querySelector('.phone-container');
    if (!phoneContainer) {
        console.error('找不到 .phone-container 元素');
        return;
    }

    phoneContainer.style.backgroundImage = `url(${url})`;
    phoneContainer.style.backgroundSize = 'cover';
    phoneContainer.style.backgroundPosition = 'center';
    phoneContainer.style.backgroundRepeat = 'no-repeat';

    console.log('壁纸已应用');
}


    const styleOptions = document.querySelectorAll('.style-option');
    styleOptions.forEach(option => {
        option.addEventListener('click', () => {
            styleOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            const style = option.dataset.style;
            localStorage.setItem('squeezeStyle', style);
            applySqueezeStyle(style);
        });
    });
    function applySqueezeStyle(style) {
        if (!squeezeWidget) return;
        squeezeWidget.classList.remove('rabbit', 'cat', 'box');
        if (style !== 'default') squeezeWidget.classList.add(style);
    }

    const customCssInput = document.getElementById('customCssInput');
    const applyCssBtn = document.getElementById('applyCssBtn');
    if (applyCssBtn) {
        applyCssBtn.addEventListener('click', () => {
            const css = customCssInput.value;
            localStorage.setItem('customCss', css);
            let customStyleTag = document.getElementById('custom-css-style');
            if (!customStyleTag) {
                customStyleTag = document.createElement('style');
                customStyleTag.id = 'custom-css-style';
                document.head.appendChild(customStyleTag);
            }
            customStyleTag.textContent = css;
            alert('CSS 已应用');
        });
    }

    const appListContainer = document.getElementById('appList');
    const iconInput = document.getElementById('iconInput');
    let currentEditingIcon = null;
    function renderAppList() {
        if (!appListContainer) return;
        appListContainer.innerHTML = '';
        const allApps = document.querySelectorAll('.app-icon .app-icon-inner');
        allApps.forEach((inner, index) => {
            let name = 'App ' + (index + 1);
            // Check if parent has span
            const parent = inner.parentElement;
            const span = parent.querySelector('span');
            if (span) name = span.textContent;
            else if (inner.closest('.dock-bar')) name = 'Dock App ' + (index + 1);
            
            const div = document.createElement('div');
            div.className = 'app-item-setting';
            
            const img = inner.querySelector('img');
            let preview = '';
            if(img) preview = `<img src="${img.src}" style="width:40px;height:40px;object-fit:cover;border-radius:10px;">`;
            
            div.innerHTML = `${preview}<span>${name}</span>`;
            div.addEventListener('click', () => { currentEditingIcon = inner; iconInput.click(); });
            appListContainer.appendChild(div);
        });
    }
    if (iconInput) {
        iconInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && currentEditingIcon) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const compressed = await window.Utils.compressImage(e.target.result, 200, 0.8);
                        // Update img src directly
                        const img = currentEditingIcon.querySelector('img');
                        if(img) img.src = compressed;
                        else currentEditingIcon.innerHTML = `<img src="${compressed}">`;
                        
                        saveIconState(currentEditingIcon, compressed);
                        renderAppList();
                    } catch (err) {
                        console.error('Icon save failed', err);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
    async function saveIconState(innerElement, src) {
        const allApps = Array.from(document.querySelectorAll('.app-icon .app-icon-inner'));
        const index = allApps.indexOf(innerElement);
        if (index !== -1) {
            const id = await window.db.saveImage(src);
            const iconStates = JSON.parse(localStorage.getItem('iconStates') || '{}');
            iconStates[index] = id;
            localStorage.setItem('iconStates', JSON.stringify(iconStates));
        }
    }
    function loadIconStates() {
        const iconStates = JSON.parse(localStorage.getItem('iconStates') || '{}');
        const allApps = document.querySelectorAll('.app-icon .app-icon-inner');
        Object.keys(iconStates).forEach(async index => { 
            if (allApps[index]) {
                const data = await window.db.getImage(iconStates[index]);
                const img = allApps[index].querySelector('img');
                if(data && img) img.src = data;
            }
        });
    }

    const activityFrequency = document.getElementById('activityFrequency');
    if (activityFrequency) {
        activityFrequency.addEventListener('change', (e) => {
            const val = parseInt(e.target.value);
            localStorage.setItem('activityFrequency', val);
            setupActivityTimer(val);
        });
    }
let activityTimer;
function setupActivityTimer(minutes) {
    if (activityTimer) clearInterval(activityTimer);

    const mins = parseInt(minutes);

    // 如果频率为 0，清除定时器并完全禁用
    if (mins <= 0) {
        console.log('活动频率为 0，已禁用实时活动生成');
        return;
    }

    console.log(`设置活动定时器：每 ${mins} 分钟生成一次活动`);

    activityTimer = setInterval(() => {
        console.log(`触发定时活动生成（频率：${mins} 分钟）`);
        triggerRandomActivity();
    }, mins * 60 * 1000);
}

    
async function triggerRandomActivity() {
    // 检查活动频率设置
    const activityFrequency = parseInt(localStorage.getItem('activityFrequency') || '0');

    // 如果频率为 0，不生成任何活动
    if (activityFrequency === 0) {
        console.log('活动频率为 0，跳过活动生成');
        return;
    }

    // 随机选择一个应用触发活动
    const apps = ['qq', 'twitter', 'instagram', 'couple', 'forum'];
    const app = apps[Math.floor(Math.random() * apps.length)];

    console.log(`[活动生成] 触发 ${app} 的后台活动（频率：${activityFrequency} 分钟）`);

    try {
        if (app === 'qq' && window.QQApp) {
            await window.QQApp.triggerRandomActivity();
        } else if (app === 'twitter' && window.TwitterApp) {
            await window.TwitterApp.generateActivity();
        } else if (app === 'instagram' && window.InstagramApp) {
            await window.InstagramApp.generateActivity();
        } else if (app === 'couple' && window.CoupleApp) {
            await window.CoupleApp.triggerRandomActivity();
        } else if (app === 'forum' && window.ForumApp) {
            await window.ForumApp.generateActivity();
        }
    } catch (e) {
        console.error('[活动生成] 错误:', e);
    }
}


// ==========================================
// World Catch-up System (Offline Simulation)
// ==========================================
async function catchUpWorld() {
    // 检查活动频率设置
    const activityFrequency = parseInt(localStorage.getItem('activityFrequency') || '0');

    // 如果频率为 0，完全禁用离线推演
    if (activityFrequency === 0) {
        console.log('活动频率为 0，跳过离线推演');
        localStorage.setItem('lastActiveTime', Date.now());
        return;
    }

    const lastActive = parseInt(localStorage.getItem('lastActiveTime') || Date.now());
    const now = Date.now();
    const diffMinutes = Math.floor((now - lastActive) / 60000);

    // 更新最后活跃时间
    localStorage.setItem('lastActiveTime', now);

    // 根据活动频率计算是否需要推演
    // 例如：如果设置 10 分钟只有离线超过 10 分钟才推演
    const minOfflineTime = Math.max(activityFrequency, 5); // 最少 5 分钟

    if (diffMinutes < minOfflineTime) {
        console.log(`离线时间 ${diffMinutes} 分钟未达到推演阈值 ${minOfflineTime} 分钟`);
        return;
    }

    const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
    if (!apiConfig.chatApiKey) {
        console.log('未配置 API，跳过离线推演');
        return;
    }

    console.log(`开始离线推演：离线 ${diffMinutes} 分钟活动频率设置 ${activityFrequency} 分钟`);

    // 显示通知
    window.System.showNotification('系统', '正在同步离线消息...', null);

    const qqData = JSON.parse(localStorage.getItem('qq_data') || '{"friends":[]}');
    const friends = qqData.friends;
    if (friends.length === 0) {
        console.log('没有好友数据跳过推演');
        return;
    }

    // 获取全局上下文
    const globalContext = window.MemoryManager.getGlobalContext();
    const charStatus = globalContext.characterStatus;

    // 根据活动频率调整活跃好友数量
    // 频率越高生成的事件越多
    const maxActiveFriends = Math.min(Math.ceil(activityFrequency / 10), 5);

    const activeFriends = friends.filter(f => {
        // 随机选择活跃的好友
        return Math.random() > 0.5;
    }).slice(0, maxActiveFriends);

    if (activeFriends.length === 0) {
        console.log('没有活跃好友跳过推演');
        return;
    }

    const friendsDesc = activeFriends.map(f => {
        const status = charStatus[f.id] ? charStatus[f.id].status : '未知';
        return `${f.name} (人设:${f.persona}, 状态:${status})`;
    }).join('\n');

    // 根据离线时间和活动频率计算事件数量
    const eventCount = Math.min(
        Math.ceil(diffMinutes / activityFrequency), // 根据频率计算
        10 // 最多 10 个事件
    );

    const prompt = `用户离线了 ${diffMinutes} 分钟。
当前时间: ${new Date().toLocaleString()}
活跃角色:\n${friendsDesc}

根据用户设置的活动频率 ${activityFrequency} 分钟推演这段时间内发生的事情。

要求：
1. 基于角色人设和状态生成真实的社交活动。
2. 生成 ${eventCount} 个左右的事件（不要太多也不要太少）。
3. 事件类型：
   - QQ消息 (type: "qq_msg", from: "角色名", content: "内容")
   - 未接来电 (type: "missed_call", from: "角色名")
   - 推特/Ins动态 (type: "post", platform: "twitter/instagram", from: "角色名", content: "内容")
   - 朋友圈点赞/评论 (type: "interaction", platform: "qq_moment", from: "角色名", content: "点赞/评论内容")

返回 JSON 数组:
[
    {"type": "qq_msg", "from": "角色A", "content": "你在干嘛？"},
    {"type": "missed_call", "from": "角色B"},
    {"type": "post", "platform": "twitter", "from": "角色C", "content": "今天天气真好"}
]`;

    try {
        const res = await window.API.callAI(prompt, apiConfig);
        let events = window.Utils.safeParseJSON(res) || [];

        console.log(`生成了 ${events.length} 个离线事件`);

        if (events.length > 0) {
            for (const evt of events) {
                const friend = friends.find(f => f.name === evt.from);
                if (!friend) continue;

                // 计算事件时间（分散在离线时间段内）
                const eventTime = Date.now() - Math.floor(Math.random() * diffMinutes * 60000);

                if (evt.type === 'qq_msg') {
                    if (window.QQApp) {
                        window.QQApp.store.update(d => {
                            if (!d.messages[friend.id]) d.messages[friend.id] = [];
                            d.messages[friend.id].push({
                                id: Date.now() + Math.random(),
                                senderId: friend.id,
                                senderName: friend.name,
                                content: evt.content,
                                type: 'text',
                                timestamp: eventTime,
                                status: 'normal'
                            });
                        });
                        window.System.showNotification(friend.name, evt.content, friend.avatar, `chat:${friend.id}`);
                    }
                } else if (evt.type === 'missed_call') {
                    if (window.QQApp) {
                        window.QQApp.store.update(d => {
                            if (!d.messages[friend.id]) d.messages[friend.id] = [];
                            d.messages[friend.id].push({
                                id: Date.now() + Math.random(),
                                senderId: friend.id,
                                senderName: friend.name,
                                content: '未接来电',
                                type: 'system_card',
                                subType: 'call',
                                timestamp: eventTime,
                                status: 'normal'
                            });
                        });
                        window.System.showNotification(friend.name, '未接来电', friend.avatar, `chat:${friend.id}`);
                    }
                } else if (evt.type === 'post') {
                    if (evt.platform === 'twitter' && window.TwitterApp) {
                        window.TwitterApp.store.update(d => {
                            d.tweets.unshift({
                                id: window.Utils.generateId('tweet'),
                                accountId: 'ai_generated',
                                isAI: true,
                                aiName: friend.name,
                                aiHandle: '@' + friend.id,
                                aiAvatar: friend.avatar,
                                text: evt.content,
                                time: eventTime,
                                likes: 0, retweets: 0, replies: 0, comments: []
                            });
                        });
                        window.System.showNotification('Twitter', `${friend.name} 发布了新推文`, null, 'twitterApp');
                    } else if (evt.platform === 'instagram' && window.InstagramApp) {
                        window.InstagramApp.store.update(d => {
                            d.posts.push({
                                id: window.Utils.generateId('ig'),
                                userId: 'ai_generated',
                                username: friend.name,
                                avatar: friend.avatar,
                                image: window.Utils.generateDefaultImage(evt.content),
                                caption: evt.content,
                                likes: 0,
                                time: eventTime,
                                comments: [],
                                filter: 'none'
                            });
                        });
                        window.System.showNotification('Instagram', `${friend.name} 发布了新帖子`, null, 'instagramApp');
                    }
                } else if (evt.type === 'interaction' && evt.platform === 'qq_moment') {
                    if (window.QQApp) {
                        const qqData = window.QQApp.store.get();
                        const userMoments = qqData.moments.filter(m => m.userId === 'user');
                        if (userMoments.length > 0) {
                            const m = userMoments[0];
                            window.QQApp.store.update(d => {
                                const moment = d.moments.find(x => x.id === m.id);
                                if (moment) {
                                    if (evt.content.includes('点赞')) {
                                        if (!moment.likes) moment.likes = [];
                                        if (!moment.likes.find(l => l.name === friend.name)) {
                                            moment.likes.push({name: friend.name});
                                        }
                                    } else {
                                        if (!moment.comments) moment.comments = [];
                                        moment.comments.push({name: friend.name, content: evt.content});
                                    }
                                }
                            });
                            window.System.showNotification(friend.name, evt.content, friend.avatar, 'qqApp');
                        }
                    }
                }
            }

            // 刷新 UI
            if (window.QQApp && document.getElementById('qqApp').style.display !== 'none') {
                window.QQApp.renderChatList();
                if(document.getElementById('tab-moments')?.classList.contains('active')) {
                    window.QQApp.renderMoments();
                }
            }

            // 显示完成通知
            setTimeout(() => {
                window.System.showNotification('系统', `已同步 ${events.length} 条离线消息`, null);
            }, 1000);
        } else {
            console.log('AI 未生成任何事件');
        }
    } catch (e) {
        console.error('离线推演失败:', e);
    }
}


    // Track visibility and activity
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            catchUpWorld();
        } else {
            localStorage.setItem('lastActiveTime', Date.now());
        }
    });
    
    // Initial check
    catchUpWorld();
    
    // Save time periodically
    setInterval(() => {
        localStorage.setItem('lastActiveTime', Date.now());
    }, 60000);


    const notificationToggle = document.getElementById('notificationToggle');
    if (notificationToggle) {
        notificationToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                Notification.requestPermission().then(permission => {
                    if (permission !== 'granted') { e.target.checked = false; alert('需要允许通知权限才能开启此功能'); }
                    else localStorage.setItem('notificationsEnabled', 'true');
                });
            } else localStorage.setItem('notificationsEnabled', 'false');
        });
    }

    const backupBtn = document.getElementById('backupBtn');
    const restoreBtn = document.getElementById('restoreBtn');
    const restoreInput = document.getElementById('restoreInput');
    if (backupBtn) {
        backupBtn.addEventListener('click', () => {
            const data = {
                todos: JSON.parse(localStorage.getItem('todos') || '[]'),
                todoHistory: JSON.parse(localStorage.getItem('todoHistory') || '[]'),
                apiConfig: JSON.parse(localStorage.getItem('apiConfig') || '{}'),
                squeezeStyle: localStorage.getItem('squeezeStyle') || 'default',
                activityFrequency: localStorage.getItem('activityFrequency') || '0',
                notificationsEnabled: localStorage.getItem('notificationsEnabled') || 'false',
                customCss: localStorage.getItem('customCss') || '',
                iconStates: JSON.parse(localStorage.getItem('iconStates') || '{}'),
                qq_data: JSON.parse(localStorage.getItem('qq_data') || '{}')
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `ai-phone-backup-${new Date().toISOString().slice(0,10)}.json`;
            a.click(); URL.revokeObjectURL(url);
        });
    }
    if (restoreBtn && restoreInput) {
        restoreBtn.addEventListener('click', () => restoreInput.click());
        restoreInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.todos) localStorage.setItem('todos', JSON.stringify(data.todos));
                        if (data.todoHistory) localStorage.setItem('todoHistory', JSON.stringify(data.todoHistory));
                        if (data.apiConfig) localStorage.setItem('apiConfig', JSON.stringify(data.apiConfig));
                        if (data.squeezeStyle) localStorage.setItem('squeezeStyle', data.squeezeStyle);
                        if (data.activityFrequency) localStorage.setItem('activityFrequency', data.activityFrequency);
                        if (data.notificationsEnabled) localStorage.setItem('notificationsEnabled', data.notificationsEnabled);
                        if (data.customCss) localStorage.setItem('customCss', data.customCss);
                        if (data.iconStates) localStorage.setItem('iconStates', JSON.stringify(data.iconStates));
                        if (data.qq_data) localStorage.setItem('qq_data', JSON.stringify(data.qq_data));
                        alert('备份恢复成功！页面将刷新。'); location.reload();
                    } catch (err) { alert('备份文件格式错误'); console.error(err); }
                };
                reader.readAsText(file);
            }
        });
    }

    // Add Emergency Reset Button Logic
    const resetDataBtn = document.createElement('button');
    resetDataBtn.className = 'action-btn secondary';
    resetDataBtn.style.marginTop = '10px';
    resetDataBtn.style.background = '#ff4d4f';
    resetDataBtn.style.color = 'white';
    resetDataBtn.textContent = '紧急重置所有数据';
    resetDataBtn.onclick = () => window.System.emergencyReset();
    
    const backupSection = document.querySelector('.setting-section:last-child .button-row');
    if(backupSection) {
        backupSection.parentElement.appendChild(resetDataBtn);
    }

    // App Switching Logic
const showPage = (id) => {
    // ★★★ 每次切换页面都强制清理所有模态框 ★★★
    if (window.cleanupModals) {
        window.cleanupModals();
    }

    // 额外强制清理设置模态框
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        settingsModal.style.cssText = 'display: none;';
        settingsModal.classList.remove('active', 'show');
    }

    const historyModal = document.getElementById('historyModal');
    if (historyModal) {
        historyModal.style.cssText = 'display: none;';
    }

    const actionSheet = document.getElementById('actionSheet');
    if (actionSheet) {
        actionSheet.style.cssText = 'display: none;';
    }

    // 页面切换动画
    const current = document.querySelector('.app-container[style*="display: flex"]');
    if (current) {
        current.classList.add('page-exit');
        setTimeout(() => {
            current.style.display = 'none';
            current.classList.remove('page-exit');
        }, 300);
    }

    const next = document.getElementById(id);
    if (next) {
        next.style.display = 'flex';
        next.classList.add('page-enter');
        setTimeout(() => next.classList.remove('page-enter'), 300);
    }
};



    
    // Expose showPage globally
    window.showPage = showPage;

    // Swipe Back Logic (Enhanced)
    let touchStartX = 0;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, {passive: false});

    document.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        
        // Horizontal Swipe (Back)
        if (touchEndX - touchStartX > 80 && touchStartX < 50 && Math.abs(touchEndY - touchStartY) < 50) {
            const currentApp = document.querySelector('.app-container[style*="display: flex"]');
            if (currentApp && currentApp.id !== 'homeScreen') {
                showPage('homeScreen');
            }
        }
        
        // Bottom Swipe Up (Home)
        if (touchStartY > window.innerHeight - 50 && touchStartY - touchEndY > 50) {
             const currentApp = document.querySelector('.app-container[style*="display: flex"]');
            if (currentApp && currentApp.id !== 'homeScreen') {
                showPage('homeScreen');
            }
        }
    });

    // Global Home Indicator Click
    document.querySelectorAll('.home-indicator-area').forEach(el => {
        el.onclick = (e) => {
            e.stopPropagation();
            showPage('homeScreen');
        };
    });

    // Dock Buttons
    const openQQBtn = document.getElementById('openQQBtn');
    if(openQQBtn) openQQBtn.onclick = () => {
        showPage('qqApp');
        if(window.QQApp) window.QQApp.renderChatList();
    };

    // Couple App Button
    const openCoupleBtn = document.getElementById('openCoupleBtn');
    if(openCoupleBtn) openCoupleBtn.onclick = () => {
        showPage('coupleApp');
        if(window.CoupleApp) window.CoupleApp.render();
    };

    // Birthday App Button
    const openBirthdayBtn = document.getElementById('openBirthdayBtn');
    if(openBirthdayBtn) openBirthdayBtn.onclick = () => {
        showPage('birthdayApp');
        if(window.BirthdayApp) window.BirthdayApp.checkBirthday();
    };

    // Twitter App Button
    const openTwitterBtn = document.getElementById('openTwitterBtn');
    if(openTwitterBtn) openTwitterBtn.onclick = () => {
        showPage('twitterApp');
        if(window.TwitterApp) window.TwitterApp.renderHome();
    };

    // Instagram App Button
    const openInstagramBtn = document.getElementById('openInstagramBtn');
    if(openInstagramBtn) openInstagramBtn.onclick = () => {
        showPage('instagramApp');
        if(window.InstagramApp) window.InstagramApp.renderHome();
    };

    // Fanfic App Button
    const openFanficBtn = document.getElementById('openFanficBtn');
    if(openFanficBtn) openFanficBtn.onclick = () => {
        showPage('fanficApp');
        if(window.FanficApp) window.FanficApp.renderList();
    };

    // Worldbook App Button
    const openWorldbookBtn = document.getElementById('openWorldbookBtn');
    if(openWorldbookBtn) openWorldbookBtn.onclick = () => {
        showPage('worldbookApp');
        if(window.WorldbookApp) window.WorldbookApp.renderBooks();
    };

    // Shop App Button
    const openShopBtn = document.getElementById('openShopBtn');
    if(openShopBtn) openShopBtn.onclick = () => {
        showPage('shopApp');
        if(window.ShopApp) window.ShopApp.renderHome();
    };

    // Forum App Button
    const openForumBtn = document.getElementById('openForumBtn');
    if(openForumBtn) openForumBtn.onclick = () => {
        showPage('forumApp');
        if(window.ForumApp) window.ForumApp.renderHome();
    };

    // Phone Check App Button
    const openPhoneCheckBtn = document.getElementById('openPhoneCheckBtn');
    if(openPhoneCheckBtn) openPhoneCheckBtn.onclick = () => {
        // Ensure container exists
        if(!document.getElementById('phoneCheckApp')) {
            const div = document.createElement('div');
            div.id = 'phoneCheckApp';
            div.className = 'app-container phone-check-app';
            div.style.display = 'none';
            div.innerHTML = `<div class="pc-header">选择角色查看手机</div><div id="pcList" class="pc-list"></div><div id="pcLoading" class="pc-loading" style="display:none;"><i class="fas fa-spinner"></i><span>正在破解系统...</span></div>`;
            document.querySelector('.phone-container').appendChild(div);
        }
        showPage('phoneCheckApp');
        if(window.PhoneCheckApp) window.PhoneCheckApp.render();
    };

    // Music Button (Simple Player)
    const openMusicBtn = document.getElementById('openMusicBtn');
    if(openMusicBtn) openMusicBtn.onclick = () => {
        alert('音乐播放器开发中... 🎵');
    };

    // Action Sheet Global
    if (!document.getElementById('actionSheet')) {
        const sheet = document.createElement('div');
        sheet.id = 'actionSheet';
        sheet.className = 'action-sheet-overlay';
        sheet.style.display = 'none';
        sheet.innerHTML = '<div class="action-sheet-content"></div>';
        document.body.appendChild(sheet);
        sheet.onclick = (e) => { if (e.target === sheet) sheet.style.display = 'none'; };
    }

    loadSettings();

// 强制移除所有图标的灰度滤镜
document.querySelectorAll('.app-icon-inner img').forEach(img => {
    img.style.filter = 'none';
    img.style.opacity = '1';
});

// 监听图标加载完成后再次移除滤镜
window.addEventListener('load', () => {
    document.querySelectorAll('.app-icon-inner img').forEach(img => {
        img.style.filter = 'none';
    });
});

    // ==========================================
    // Memory Manager (Cross-App Memory)
    // ==========================================
    window.MemoryManager = {
        getGlobalContext: () => {
            const context = {
                recentChats: [],
                recentPosts: [],
                characterStatus: {}
            };

            try {
                // 1. QQ Moments & Chats
                const qqData = JSON.parse(localStorage.getItem('qq_data') || '{}');
                if(qqData.moments) {
                    qqData.moments.slice(0, 5).forEach(m => {
                        context.recentPosts.push(`[朋友圈] ${m.name}: ${m.text} (${new Date(m.timestamp).toLocaleString()})`);
                    });
                }
                // Extract recent chat summaries if available
                if(qqData.friends) {
                    qqData.friends.forEach(f => {
                        if(f.memory && f.memory.summary) {
                            context.recentChats.push(`[与 ${f.name} 的回忆]: ${f.memory.summary}`);
                        }
                        // Update status
                        context.characterStatus[f.id] = { status: f.status || '未知', name: f.name };
                    });
                }

                // 2. Twitter Tweets
                const twData = JSON.parse(localStorage.getItem('twitter_data') || '{}');
                if(twData.tweets) {
                    twData.tweets.slice(0, 5).forEach(t => {
                        context.recentPosts.push(`[推特] ${t.aiName || '用户'}: ${t.text} (${new Date(t.time).toLocaleString()})`);
                    });
                }

                // 3. Instagram Posts
                const igData = JSON.parse(localStorage.getItem('instagram_data') || '{}');
                if(igData.posts) {
                    igData.posts.slice(0, 5).forEach(p => {
                        context.recentPosts.push(`[Ins] ${p.username}: ${p.caption} (${new Date(p.time).toLocaleString()})`);
                    });
                }

                // 4. Couple Diary
                const cpData = JSON.parse(localStorage.getItem('couple_data') || '{}');
                if(cpData.diaries) {
                    cpData.diaries.slice(0, 3).forEach(d => {
                        context.recentPosts.push(`[情侣日记] ${d.date}: ${d.content}`);
                    });
                }
                if(cpData.notes) {
                    cpData.notes.slice(0, 3).forEach(n => {
                        context.recentPosts.push(`[情侣碎碎念]: ${n.content}`);
                    });
                }

            } catch(e) { console.error('Memory gather error', e); }

            return context;
        }
    };

    // Global System Object for Context Switching
    window.System = {
        originalContext: null,
        isPhoneCheckMode: false,
        currentCheckedFriend: null,
        
        switchContext: (friend) => {
            window.System.isPhoneCheckMode = true;
            window.System.currentCheckedFriend = friend;
            localStorage.setItem('is_phone_check_mode', 'true');

            // Check for existing backup first to prevent dirty backup
            const existingBackup = localStorage.getItem('system_backup');
            if (existingBackup) {
                try {
                    window.System.originalContext = JSON.parse(existingBackup);
                } catch(e) { console.error('Failed to parse existing backup', e); }
            }

            if(!window.System.originalContext) {
                const context = {
                    qq: localStorage.getItem('qq_data'),
                    twitter: localStorage.getItem('twitter_data'),
                    instagram: localStorage.getItem('instagram_data'),
                    fanfic: localStorage.getItem('fanfic_data'),
                    birthday: localStorage.getItem('birthday_date'),
                    shop: localStorage.getItem('shop_data'),
                    forum: localStorage.getItem('forum_data'),
                    couple: localStorage.getItem('couple_data'),
                    worldbook: localStorage.getItem('worldbook_data')
                };
                window.System.originalContext = context;
                // Persist backup to handle page reloads
                localStorage.setItem('system_backup', JSON.stringify(context));
            }
            
            // Mock Friend's Data
            const mockQQ = {
                user: { name: friend.name, avatar: friend.avatar, qq: '123456', signature: friend.persona.substring(0, 20) },
                friends: [], // Empty or mock
                messages: {},
                moments: [],
                wallet: { balance: (Math.random() * 5000).toFixed(2), history: [] },
                favorites: [],
                emojis: [],
                settings: {}
            };
            
            localStorage.setItem('qq_data', JSON.stringify(mockQQ));
            
            localStorage.setItem('fanfic_data', JSON.stringify({ posts: [], settings: {} })); // Clear for Diary
            localStorage.removeItem('birthday_date'); // Clear for App Usage

            // Mock Twitter Data
            const mockTwitter = {
                currentAccountId: 'char_main',
                accounts: [
                    { id: 'char_main', name: friend.name, handle: '@' + (friend.id || 'user'), avatar: friend.avatar, bio: friend.persona.substring(0, 50), following: Math.floor(Math.random()*200), followers: Math.floor(Math.random()*200), verified: false }
                ],
                tweets: [],
                dms: [],
                settings: { worldSetting: '现代社会' }
            };
            localStorage.setItem('twitter_data', JSON.stringify(mockTwitter));

            // Mock Instagram Data
            const mockInstagram = {
                profile: { name: friend.name, username: (friend.id || 'user'), bio: friend.persona.substring(0, 50), posts: 0, followers: Math.floor(Math.random()*200), following: Math.floor(Math.random()*200), avatar: friend.avatar, pronouns: '', gender: '' },
                posts: []
            };
            localStorage.setItem('instagram_data', JSON.stringify(mockInstagram));

            // Trigger UI updates
            if(window.QQApp) { window.QQApp.store.init(); window.QQApp.initUI(); }
            if(window.TwitterApp) window.TwitterApp.store.init();
            if(window.InstagramApp) window.InstagramApp.store.init();
            if(window.FanficApp) window.FanficApp.store.init();
            if(window.BirthdayApp) window.BirthdayApp.initUI(); // Re-init to update UI for App Usage
            if(window.CoupleApp) window.CoupleApp.store.init();

            // Update App Icons/Names for Phone Check Mode
            const fanficIcon = document.getElementById('openFanficBtn');
            if(fanficIcon) {
                fanficIcon.querySelector('span').textContent = '日记';
                fanficIcon.querySelector('i').className = 'fas fa-book-medical'; // Change icon
            }
            const birthdayIcon = document.getElementById('openBirthdayBtn');
            if(birthdayIcon) {
                birthdayIcon.querySelector('span').textContent = 'APP记录';
                birthdayIcon.querySelector('i').className = 'fas fa-chart-bar'; // Change icon
            }
            
            // Notify all apps to refresh if they have a refresh method
            document.querySelectorAll('.app-container').forEach(el => {
                // Force re-render if visible
                if(el.style.display !== 'none') {
                    // This is a bit hacky, better to rely on showPage
                }
            });
        },
        resetContext: () => {
            window.System.isPhoneCheckMode = false;
            window.System.currentCheckedFriend = null;
            localStorage.removeItem('is_phone_check_mode');

            let context = window.System.originalContext;
            
            // Try to load from localStorage if memory is empty
            if (!context) {
                const backup = localStorage.getItem('system_backup');
                if (backup) {
                    try {
                        context = JSON.parse(backup);
                    } catch (e) { console.error('Backup parse error', e); }
                }
            }

            if(context) {
                const restore = (key, val) => {
                    if(val !== null && val !== undefined) localStorage.setItem(key, val);
                    else localStorage.removeItem(key);
                };

                restore('qq_data', context.qq);
                restore('twitter_data', context.twitter);
                restore('instagram_data', context.instagram);
                restore('fanfic_data', context.fanfic);
                restore('birthday_date', context.birthday);
                restore('shop_data', context.shop);
                restore('forum_data', context.forum);
                restore('couple_data', context.couple);
                restore('worldbook_data', context.worldbook);

                window.System.originalContext = null;
                localStorage.removeItem('system_backup'); // Clear backup
                
                // Force full reload to ensure clean state
                location.reload();
            }
        },
        emergencyReset: () => {
            if(confirm('确定要重置所有数据吗？这将清除所有应用数据并恢复到初始状态。此操作不可撤销。')) {
                localStorage.removeItem('qq_data');
                localStorage.removeItem('twitter_data');
                localStorage.removeItem('instagram_data');
                localStorage.removeItem('fanfic_data');
                localStorage.removeItem('birthday_date');
                localStorage.removeItem('shop_data');
                localStorage.removeItem('forum_data');
                localStorage.removeItem('couple_data');
                localStorage.removeItem('worldbook_data');
                localStorage.removeItem('system_backup');
                alert('数据已重置，页面将刷新。');
                location.reload();
            }
        },
        showNotification: (title, body, icon) => {
            if(Notification.permission === 'granted') {
                new Notification(title, { body, icon });
            } else {
                // In-app notification fallback
            const notif = document.createElement('div');
            notif.className = 'in-app-notification';
            notif.style.cssText = 'position:absolute; top:10px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:white; padding:10px 20px; border-radius:20px; z-index:10000; display:flex; align-items:center; gap:10px; box-shadow:0 4px 10px rgba(0,0,0,0.2); animation: slideDown 0.5s ease; width: 90%;';
            notif.innerHTML = `<div style="width:30px;height:30px;background:url('${icon||''}');background-size:cover;border-radius:50%;"></div><div><div style="font-weight:bold;font-size:12px;">${title}</div><div style="font-size:10px;">${body}</div></div>`;
            document.querySelector('.phone-container').appendChild(notif);
                setTimeout(() => {
                    notif.style.opacity = '0';
                    setTimeout(() => notif.remove(), 500);
                }, 3000);
            }
        }
    };
    
    // Auto-restore logic
    const backup = localStorage.getItem('system_backup');
    const isPhoneCheck = localStorage.getItem('is_phone_check_mode') === 'true';
    
    if (backup) {
        if (isPhoneCheck) {
            console.log('Restoring Phone Check Mode...');
            try {
                window.System.originalContext = JSON.parse(backup);
                window.System.isPhoneCheckMode = true;
                // Wait for PhoneCheckApp to be ready and show exit button
                setTimeout(() => {
                    if(window.PhoneCheckApp) window.PhoneCheckApp.showExitButton();
                }, 1000);
            } catch(e) { console.error(e); }
        } else {
            console.log('Found system backup (crash recovery), restoring context...');
            setTimeout(() => {
                if(window.System && window.System.resetContext) {
                    window.System.resetContext();
                    alert('检测到上次异常退出，已自动恢复您的数据。');
                }
            }, 500);
        }
    }

    // Background Activity Simulation & Notification Center
    window.System.notificationQueue = [];
    
    window.System.processNotifications = () => {
        if(window.System.notificationQueue.length > 0) {
            const notif = window.System.notificationQueue.shift();
            window.System.showNotification(notif.title, notif.body, notif.icon, notif.appId);
        }
    };
    setInterval(window.System.processNotifications, 2000); // Check queue every 2s

    // Enhanced Background Activity Scheduler
    setInterval(async () => {
        const freq = parseInt(localStorage.getItem('activityFrequency') || '0');
        if(freq <= 0) return;

        // Calculate probability based on frequency (minutes)
        // If freq is 10 mins, we check every 1 min, so 1/10 chance roughly
        const chance = 1 / Math.max(1, freq);
        
        if(Math.random() < chance) {
            console.log('Triggering Background Activity...');
            
            // Randomly choose an app to trigger
            const apps = ['qq', 'twitter', 'instagram', 'couple', 'forum'];
            const app = apps[Math.floor(Math.random() * apps.length)];
            
            try {
                if(app === 'qq' && window.QQApp) {
                    await window.QQApp.triggerRandomActivity();
                } else if(app === 'twitter' && window.TwitterApp) {
                    await window.TwitterApp.generateActivity();
                } else if(app === 'instagram' && window.InstagramApp) {
                    await window.InstagramApp.generateActivity();
                } else if(app === 'couple' && window.CoupleApp) {
                    await window.CoupleApp.triggerRandomActivity();
                } else if(app === 'forum' && window.ForumApp) {
                    await window.ForumApp.generateActivity();
                }
            } catch(e) {
                console.error('Background Activity Error:', e);
            }
        }
    }, 60000); // Check every minute

    // Override showNotification to handle click and app opening
    window.System.showNotification = (title, body, icon, appId) => {
        // Play sound (optional)
        // const audio = new Audio('assets/notification.mp3'); audio.play().catch(()=>{});

        // Always try to show browser notification if permitted
        if(Notification.permission === 'granted') {
            const n = new Notification(title, { body, icon, tag: appId });
            n.onclick = () => {
                window.focus();
                if(appId) {
                    if(appId.startsWith('chat:')) {
                        const chatId = appId.split(':')[1];
                        window.showPage('qqApp');
                        if(window.QQApp) {
                            window.QQApp.currentChatId = chatId;
                            // Determine type
                            const qqData = window.QQApp.store.get();
                            let type = 'friend';
                            let target = qqData.friends.find(f=>f.id===chatId);
                            if(!target) {
                                target = qqData.groups.find(g=>g.id===chatId);
                                type = 'group';
                            }
                            
                            if(target) {
                                window.QQApp.currentChatType = type;
                                document.getElementById('chatTitle').textContent = target.name;
                                document.getElementById('chatWindow').style.display = 'flex';
                                window.QQApp.renderMessages();
                            }
                        }
                    } else {
                        window.showPage(appId);
                    }
                }
                n.close();
            };
        }
        
        // Also show in-app notification if the app is not currently focused or if browser notifications are disabled
        // But to ensure "even if background cleared" (simulated), we always show in-app notification if the user is looking at the screen
        // unless we are already in that chat.
        
        let shouldShowInApp = true;
        if(appId && appId.startsWith('chat:')) {
            const chatId = appId.split(':')[1];
            if(window.QQApp && window.QQApp.currentChatId === chatId && document.getElementById('chatWindow').style.display !== 'none' && document.getElementById('qqApp').style.display !== 'none') {
                shouldShowInApp = false;
            }
        }

        if(shouldShowInApp) {
            const notif = document.createElement('div');
            notif.className = 'in-app-notification';
            // Styles are now in css/global.css
            
            let iconHtml = '';
            if(icon && (icon.startsWith('data:') || icon.startsWith('blob:') || icon.startsWith('http'))) {
                iconHtml = `<div style="width:36px;height:36px;background:url('${icon}') center/cover;border-radius:50%;"></div>`;
            } else {
                iconHtml = `<div style="width:36px;height:36px;background:#eee;border-radius:50%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-bell" style="color:#666;"></i></div>`;
            }

            notif.innerHTML = `
                ${iconHtml}
                <div style="flex:1; overflow:hidden;">
                    <div style="font-weight:bold;font-size:14px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
                    <div style="font-size:12px;color:#666;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${body}</div>
                </div>
                <div style="font-size:10px;color:#999;flex-shrink:0;">刚刚</div>
            `;
            
            notif.onclick = () => {
                if(appId) {
                    if(appId.startsWith('chat:')) {
                        const chatId = appId.split(':')[1];
                        window.showPage('qqApp');
                        if(window.QQApp) {
                            window.QQApp.currentChatId = chatId;
                            // Determine type
                            const qqData = window.QQApp.store.get();
                            let type = 'friend';
                            let target = qqData.friends.find(f=>f.id===chatId);
                            if(!target) {
                                target = qqData.groups.find(g=>g.id===chatId);
                                type = 'group';
                            }
                            
                            if(target) {
                                window.QQApp.currentChatType = type;
                                document.getElementById('chatTitle').textContent = target.name;
                                document.getElementById('chatWindow').style.display = 'flex';
                                window.QQApp.renderMessages();
                            }
                        }
                    } else {
                        window.showPage(appId);
                    }
                }
                notif.style.opacity = '0';
                setTimeout(() => notif.remove(), 300);
            };

            // Ensure notification is appended to phone container, even if hidden
            const container = document.querySelector('.phone-container');
            if(container) {
                container.appendChild(notif);
                // Force display if container is hidden (simulated background)
                // Note: In this specific project structure, phone-container is always visible, 
                // but apps inside might be hidden. The notification is a direct child of phone-container,
                // so it will overlay on top of whatever app (or home screen) is showing.
            }
            
            // Auto dismiss
            setTimeout(() => {
                if(document.body.contains(notif)) {
                    notif.style.opacity = '0';
                    setTimeout(() => notif.remove(), 500);
                }
            }, 5000);


        }
    };

});
