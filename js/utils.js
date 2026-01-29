// ==========================================
// Utils
// ==========================================

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// 图片压缩工具
const compressImage = (base64, maxWidth = 800, quality = 0.7) => new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64); // 失败则返回原图
});

const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const COUNTRIES = [
    {name: '中国', timezone: 8}, {name: '日本', timezone: 9}, {name: '美国 (纽约)', timezone: -5},
    {name: '美国 (洛杉矶)', timezone: -8}, {name: '英国', timezone: 0}, {name: '法国', timezone: 1},
    {name: '俄罗斯 (莫斯科)', timezone: 3}, {name: '澳大利亚 (悉尼)', timezone: 11},
    {name: '印度', timezone: 5.5}, {name: '阿联酋 (迪拜)', timezone: 4}
];

// 格式化时间
const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
};

// 震动反馈
const vibrate = (pattern = 50) => {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

// 生成默认头像 (简约风格)
const generateDefaultAvatar = (name) => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    // 简约灰色背景
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, 200, 200);
    
    // 绘制简约人像轮廓
    ctx.fillStyle = '#ffffff';
    
    // 头
    ctx.beginPath();
    ctx.arc(100, 85, 50, 0, Math.PI * 2);
    ctx.fill();
    
    // 身体
    ctx.beginPath();
    ctx.arc(100, 220, 80, 0, Math.PI * 2);
    ctx.fill();

    // 如果有名字，绘制首字母
    if (name) {
        ctx.fillStyle = '#999';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name.charAt(0).toUpperCase(), 100, 100);
    }

    return canvas.toDataURL('image/png');
};

// 生成默认图片 (Canvas 设计风格)
const generateDefaultImage = (text = 'Image') => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    // 生成随机渐变背景
    const hue = Math.floor(Math.random() * 360);
    const gradient = ctx.createLinearGradient(0, 0, 600, 400);
    gradient.addColorStop(0, `hsl(${hue}, 60%, 80%)`);
    gradient.addColorStop(1, `hsl(${(hue + 40) % 360}, 60%, 90%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 400);
    
    // 绘制装饰图案
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for(let i=0; i<10; i++) {
        const x = Math.random() * 600;
        const y = Math.random() * 400;
        const r = Math.random() * 50 + 20;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // 绘制文字
    ctx.fillStyle = '#555';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 简单的文字换行处理
    const maxWidth = 500;
    const words = text.split('');
    let line = '';
    let lines = [];
    
    for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n];
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n];
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    const lineHeight = 60;
    const startY = 200 - ((lines.length - 1) * lineHeight) / 2;

    for(let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], 300, startY + (i * lineHeight));
    }
    
    return canvas.toDataURL('image/png');
};

// 预览图片
const previewImage = (url) => {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:9999;display:flex;justify-content:center;align-items:center;';
    modal.innerHTML = `<img src="${url}" style="max-width:100%;max-height:100%;object-fit:contain;">`;
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
};

// Toast 提示
const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        if(document.body.contains(toast)) toast.remove();
    }, 2000);
};

// 安全解析 JSON (处理 AI 可能返回的 Markdown 标记或额外文本)
const safeParseJSON = (str) => {
    if (!str) return null;
    try {
        return JSON.parse(str);
    } catch (e) {
        try {
            // 尝试移除 Markdown 代码块标记
            let cleanStr = str.replace(/```json\s*|\s*```/g, '').replace(/```\s*|\s*```/g, '');
            return JSON.parse(cleanStr);
        } catch (e2) {
            try {
                // 尝试提取数组或对象
                const arrayMatch = str.match(/\[[\s\S]*\]/);
                if (arrayMatch) return JSON.parse(arrayMatch[0]);
                
                const objectMatch = str.match(/\{[\s\S]*\}/);
                if (objectMatch) return JSON.parse(objectMatch[0]);
            } catch (e3) {
                console.error('JSON Parse Failed:', str);
            }
        }
    }
    return null;
};

// 自定义弹窗
const showCustomDialog = ({ title, content, inputs = [], buttons = [] }) => {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'custom-dialog-overlay';
        
        let inputsHtml = '';
        inputs.forEach(input => {
            if(input.type === 'textarea') {
                inputsHtml += `<textarea id="${input.id}" placeholder="${input.placeholder || ''}" style="width:100%;height:100px;padding:10px;border:1.5px solid #333;border-radius:10px;outline:none;resize:none;margin-bottom:10px;">${input.value || ''}</textarea>`;
            } else {
                inputsHtml += `<input id="${input.id}" type="${input.type || 'text'}" placeholder="${input.placeholder || ''}" value="${input.value || ''}" style="margin-bottom:10px;">`;
            }
        });

        let buttonsHtml = '';
        if(buttons.length === 0) {
            buttons = [
                { text: '取消', class: 'cancel', value: false },
                { text: '确定', class: 'confirm', value: true }
            ];
        }
        
        buttons.forEach((btn, index) => {
            buttonsHtml += `<button class="custom-dialog-btn ${btn.class || ''}" data-index="${index}">${btn.text}</button>`;
        });

        overlay.innerHTML = `
            <div class="custom-dialog">
                <h3>${title}</h3>
                ${content ? `<p>${content}</p>` : ''}
                ${inputsHtml}
                <div class="custom-dialog-buttons">
                    ${buttonsHtml}
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        const btns = overlay.querySelectorAll('.custom-dialog-btn');
        btns.forEach(btn => {
            btn.onclick = () => {
                const index = btn.dataset.index;
                const result = buttons[index].value;
                
                // Collect input values
                const inputValues = {};
                inputs.forEach(input => {
                    inputValues[input.id] = document.getElementById(input.id).value;
                });
                
                overlay.remove();
                resolve({ action: result, inputs: inputValues });
            };
        });
    });
};

// 导出到全局
window.Utils = {
    fileToBase64,
    compressImage,
    generateId,
    COUNTRIES,
    formatTime,
    vibrate,
    generateDefaultAvatar,
    generateDefaultImage,
    previewImage,
    showToast,
    showCustomDialog,
    safeParseJSON
};
