export const baseQuestions = [
  { id: 'q1', type: 'single', title: '您的网球球龄大概多久？', options: [ { label: '不到1年', score: 0 }, { label: '1 - 3年', score: 2 }, { label: '3年以上', score: 5 } ] },
  { id: 'q2', type: 'single', title: '您平均每周打几次网球？', options: [ { label: '偶尔打一次', score: 0 }, { label: '每周 1 - 2 次', score: 3 }, { label: '每周 3 次以上', score: 6 } ] },
  { id: 'q3', type: 'single', title: '目前您【参与比赛】的状态是？', options: [ { label: '新手，主要在上课/偶尔拉球，完全没打过比赛', score: 0, desc: '我们将为您进入新人快速通道。' }, { label: '能和球友进行多拍拉球，并开始计分对抗', score: 5, desc: '进入进阶评测' }, { label: '经常参加俱乐部或业余赛事', score: 10, desc: '进入进阶评测' } ] }
];

export const newbieQuestions = [
  { id: 'q4', type: 'single', title: '您的【正手击球】现状？', options: [ { label: '老打框', score: 1 }, { label: '勉强能打回去但经常出界/下网', score: 3 }, { label: '能在中场稳定连续推挡5拍以上', score: 5 } ] },
  { id: 'q5', type: 'single', title: '您的【反手击球】现状？', options: [ { label: '几乎不会', score: 0 }, { label: '不稳', score: 2 }, { label: '勉强能推挡几拍', score: 4 } ] },
  { id: 'q6', type: 'single', title: '关于【发球】，您的一发情况是？', options: [ { label: '还在学原地挑球', score: 1 }, { label: '下手发球', score: 2 }, { label: '能抛球完成头顶击发', score: 4 } ] },
  { id: 'q7', type: 'single', title: '您在场上的【步伐反应】如何？', options: [ { label: '站桩打球，球不在身边就不追了', score: 1 }, { label: '会跑动接球，但总觉得步点不对', score: 3 } ] },
  { id: 'q8', type: 'single', title: '您熟悉网球的【计分规则】吗？', options: [ { label: '不太清楚（15, 30, 40...平分）', score: 0 }, { label: '能够顺畅地自己报分裁判', score: 2 } ] },
  { id: 'q9', type: 'single', title: '您的【击球甜区】感知情况？', options: [ { label: '还体会不到什么是甜区', score: 1 }, { label: '偶尔能打出清脆“嘭”的响声', score: 5 } ] }
];

export const advancedQuestions = [
  { id: 'q10', type: 'single', title: '你的【正手击球深度与旋转】处于什么水平？', options: [ { label: '主要平击/推挡', score: 2, desc: '球大多落在发球线内，没多少向前旋转。' }, { label: '带有一定上旋', score: 5, desc: '能把球压在底线深区，具备了一定相持资本。' }, { label: '上旋强烈且极具破坏力', score: 8, desc: '球速快且落地前冲，能主动发力且失误极少。' } ] },
  { id: 'q11', type: 'single', title: '您的【反手】相持能力？', options: [ { label: '只能切削过渡', score: 3 }, { label: '可以稳定回击中场球', score: 6 }, { label: '能变线打出制胜分', score: 9 } ] },
  { id: 'q12', type: 'single', title: '当遇到【浅球】时，您通常的处理方式？', options: [ { label: '容易失误，不敢下杀手', score: 3 }, { label: '能把握机会打出制胜分', score: 6 }, { label: '自信得分并能随球上网', score: 8 } ] },
  { id: 'q13', type: 'single', title: '您的【高压球】成功率？', options: [ { label: '低于30%', score: 2 }, { label: '50% 左右', score: 5 }, { label: '80% 以上', score: 8 } ] },
  { id: 'q14', type: 'single', title: '面对【月亮球】（高弹跳防守球）的处理手段？', options: [ { label: '只能退到围挡外防守', score: 2 }, { label: '可以在球上升期或高点压迫回击', score: 6 } ] },
  { id: 'q15', type: 'single', title: '您的【一发成功率与质量】？', options: [ { label: '球速慢，靠运气进', score: 2 }, { label: '稳定在50%，带有一定速度', score: 5 }, { label: '能稳定发出平击或切削，具备压迫性', score: 8 } ] },
  { id: 'q16', type: 'single', title: '您的【二发稳定性】？', options: [ { label: '经常双误，或者只敢轻轻抛过去', score: 1 }, { label: '很少双误，主要采用上旋发球保证过网', score: 6 } ] },
  { id: 'q17', type: 'single', title: '您的【一发接发】能力？', options: [ { label: '面对有力发球只能挡回甚至接不到', score: 2 }, { label: '能利用对手发球力量借力回深', score: 6 } ] },
  { id: 'q18', type: 'single', title: '对付对手偏软的【二发】时，您习惯：', options: [ { label: '安全推回', score: 3 }, { label: '主动迎前发力，掌握主导权', score: 7 } ] },
  { id: 'q19', type: 'single', title: '您在【网前截击】的自信程度？', options: [ { label: '网前恐惧症', score: 1 }, { label: '能挡过网，但无法控制落点', score: 4 }, { label: '能干净利落地改变方向得分', score: 8 } ] },
  { id: 'q20', type: 'single', title: '多拍相持时，您的【被迫上网】应对？', options: [ { label: '很容易被穿越', score: 3 }, { label: '能完成防守截击并调整身位', score: 7 } ] },
  { id: 'q21', type: 'single', title: '您的【发球上网】战术频率？', options: [ { label: '从未使用过', score: 2 }, { label: '偶尔作为奇招尝试', score: 5 }, { label: '是常规武器', score: 8 } ] },
  { id: 'q22', type: 'single', title: '比赛中您的【战术预判】能力？', options: [ { label: '只能机械把球打回去', score: 2 }, { label: '能根据对手站位调整击球落点', score: 5 }, { label: '能连续设计战术陷阱，强迫对手失误', score: 9 } ] },
  { id: 'q23', type: 'single', title: '关键分（如破发点、盘点）的【心理素质】？', options: [ { label: '肌肉僵硬，缩手缩脚', score: 2 }, { label: '保持平时水平', score: 6 }, { label: '异常兴奋，能超常发挥', score: 8 } ] }
];

export default { baseQuestions, newbieQuestions, advancedQuestions };
