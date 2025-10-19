import type { ExerciseName } from './deck';

export const exerciseLabels: Record<ExerciseName, string> = {
  腕立て伏せ: '腕立て',
  スクワット: 'スクワット',
  バーピー: 'バーピー',
  腹筋: '腹筋'
};

export const exerciseTips: Record<ExerciseName, string> = {
  腕立て伏せ: '胸張って体幹ロック、肘絞り押し込むフロアでノック',
  スクワット: 'かかと踏みしめリズムでドロップ、腰落とし弾き返せステージトップ',
  バーピー: 'しゃがんで跳ねる爆裂ダッシュ、胸まで戻って全身スプラッシュ',
  腹筋: '背中を寝かせてコアをクラッチ、呼吸で刻んで芯までキャッチ'
};

export const hypePool = [
  'ビートに乗って全力アップロード、粘り切って限界ブレイクモード！ブラザー！！',
  'ステップ刻んでフロアにライドオン、汗が光ってテンションハイゾーン！ブラザー！！',
  'コアを締めて呼吸はディープゾーン、フォーム決めれば勝利はマイゾーン！ブラザー！！',
  '仲間の声援フレイムでファイヤーオン、最後の一回ブチ抜けチャンピオン！ブラザー！！'
] as const;

export function pickHypeLine(indexSeed: number) {
  const index = Math.abs(indexSeed) % hypePool.length;
  return hypePool[index];
}
