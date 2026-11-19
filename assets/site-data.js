/* Content layer. Titles, introductions and ordering can be changed without editing the layout. */
window.PORTFOLIO_SITE = {
  name: { zh: '零壹', en: '零壹' },
  about: {
    zh: '以 Cosplay 人像为共同主题，记录角色、人物与空间。从现场的光线，到棚内的姿态，再到后期合成的世界，作品按拍摄方式归入五个系列。',
    en: 'Cosplay portraiture connects these photographs: characters, people and the spaces around them. The archive follows five approaches, from event lighting and studio sessions to constructed worlds.'
  }
};
window.STUDIO_SERIES = [
  { id: 'composite', number: '01', zh: '后期合成', en: 'Composite',
    subtitle: { zh: '角色与想象中的世界', en: 'Characters in imagined worlds' },
    intro: { zh: '从人物出发，让光线、色彩与场景在后期中重新相遇。这个系列集中呈现经过合成与氛围塑造的角色肖像。', en: 'Beginning with the portrait, light, colour and setting meet again in post-production. This series brings together character photographs shaped through compositing and atmosphere.' },
    method: { zh: '人物摄影 / 后期合成', en: 'Portrait photography / Compositing' } },
  { id: 'white-studio', number: '02', zh: '白棚摄影', en: 'White studio',
    subtitle: { zh: '留白中的人物与姿态', en: 'Gesture against an open background' },
    intro: { zh: '以干净的棚内背景与可控光线，把视线留给人物。服装、表情与细微姿态共同组成画面。', en: 'A clean studio background and controlled light bring attention to the person. Costume, expression and small gestures carry the frame.' },
    method: { zh: '棚拍人像 / 布光', en: 'Studio portraiture / Lighting' } },
  { id: 'event-lighting', number: '03', zh: '漫展灯阵', en: 'Light field',
    subtitle: { zh: '现场光线中的角色瞬间', en: 'Characters caught in event light' },
    intro: { zh: '在漫展现场与灯阵之间寻找人物的轮廓。变化的光线与周围的空间一起，留下角色在场的瞬间。', en: 'Portraits made among the lighting rigs and changing conditions of cosplay events. Light and the surrounding space hold a moment of the character’s presence.' },
    method: { zh: '漫展现场 / 灯阵摄影', en: 'Cosplay events / Lighting rigs' } },
  { id: 'outdoor', number: '04', zh: '外景摄影', en: 'Open air',
    subtitle: { zh: '走入真实的风景', en: 'Portraits within a real landscape' },
    intro: { zh: '让角色走入真实环境。自然光、距离与景物，为人像提供场景，也为叙事留出空间。', en: 'Characters step into a real environment. Natural light, distance and landscape give the portrait a setting and leave room for a story.' },
    method: { zh: '外景人像 / 环境光', en: 'Location portraiture / Available light' } },
  { id: 'interior', number: '05', zh: '室内场景', en: 'Interior scenes',
    subtitle: { zh: '人物与房间的关系', en: 'The figure and the room' },
    intro: { zh: '将人物置于有色彩与结构的室内场景。墙面、道具与光线，共同参与角色的表达。', en: 'Portraits within interiors shaped by colour and structure. Walls, props and light become part of the character’s expression.' },
    method: { zh: '室内人像 / 场景构成', en: 'Interior portraiture / Scene composition' } }
];
