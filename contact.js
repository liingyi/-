/* 填写真实邮箱和二维码图片路径后，联系弹窗会自动显示。保留二维码四周白边。 */
window.PORTFOLIO_CONTACT = {
  name: { zh: '零壹', en: '零壹' },
  intro: { zh: '摄影约拍 · 项目合作', en: 'Portrait sessions · Creative collaborations' },
  methods: [
    { label: { zh: '邮箱', en: 'Email' }, value: '', href: '' }
    // 填写示例：value 写真实邮箱；href 写 mailto: 加真实邮箱。
  ],
  qrCodes: [
    { label: { zh: 'QQ', en: 'QQ' }, src: 'assets/contact/qq-qr.png', size: 'main', caption: { zh: '扫码联系', en: 'Scan to connect' } },
    { label: { zh: '微信', en: 'WeChat' }, src: 'assets/contact/wechat-qr.png', size: 'main', caption: { zh: '扫码联系', en: 'Scan to connect' } },
    { label: { zh: '抖音', en: 'Douyin' }, src: 'assets/contact/douyin-qr.png', size: 'small', caption: { zh: '作者主页', en: 'My profile' } },
    { label: { zh: '小红书', en: 'Xiaohongshu' }, src: 'assets/contact/xiaohongshu-qr.png', size: 'small', caption: { zh: '作者主页', en: 'My profile' } }
  ]
};
