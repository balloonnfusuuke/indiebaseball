
import React from 'react';
import { Edit3, BarChart2, Database, Settings as SettingsIcon, Zap, ClipboardList, Target, Grid3X3, RefreshCw, Flag, MoveRight, Users, Shield, Save, BookOpen } from 'lucide-react';

export const HelpPage: React.FC = () => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in space-y-10">
      
      {/* Header */}
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
        <h1 className="text-3xl font-extrabold text-team-navy mb-4 flex items-center gap-3">
          <BookOpen className="text-team-red" size={32} />
          アプリケーション操作ガイド
        </h1>
        <p className="text-slate-600 mb-6">
          IndieBall Stats Managerの全機能の使い方を解説します。
          本アプリは、試合中のリアルタイム入力から高度なセイバーメトリクス分析まで対応した、草野球・独立リーグ向けのデータ管理システムです。
        </p>
        
        {/* TOC */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h3 className="font-bold text-slate-700 mb-2 text-sm">目次</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-600 font-bold">
            <button onClick={() => scrollTo('section-input-live')} className="text-left hover:underline">1. 試合データ入力 (試合モード)</button>
            <button onClick={() => scrollTo('section-input-batch')} className="text-left hover:underline">2. 過去データ入力 (一括モード)</button>
            <button onClick={() => scrollTo('section-analysis')} className="text-left hover:underline">3. 成績分析 (ダッシュボード)</button>
            <button onClick={() => scrollTo('section-settings')} className="text-left hover:underline">4. 設定・データ管理</button>
          </div>
        </div>
      </div>

      {/* 1. Live Input */}
      <div id="section-input-live" className="space-y-6">
        <h2 className="text-2xl font-bold text-team-navy border-b-2 border-team-navy pb-2 flex items-center gap-2">
          <Edit3 /> 1. 試合データ入力 (試合モード)
        </h2>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <span className="bg-team-navy text-white w-6 h-6 rounded flex items-center justify-center text-sm">A</span>
            試合のセットアップ
          </h3>
          <p className="text-sm text-slate-600">
            「データ入力」タブの<span className="font-bold bg-slate-100 px-2 rounded">試合モード</span>を選択します。
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2">
            <li><strong>日付・対戦相手:</strong> 上部の入力欄で設定します。リストにない相手は設定画面で追加するか、直接入力後に保存できます。</li>
            <li><strong>スタメン登録:</strong> 試合開始前に、自チームと相手チームのオーダー（1〜9番）を設定します。DH制や全員打ちにも柔軟に対応するため、10番以降も随時追加可能です。</li>
            <li><strong>試合開始:</strong> 設定が完了したら「試合開始」ボタンを押すと、プレイ入力画面に切り替わります。</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <span className="bg-team-navy text-white w-6 h-6 rounded flex items-center justify-center text-sm">B</span>
            プレイの記録（基本フロー）
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-bold text-sm text-blue-600">攻撃時 (自チーム)</h4>
              <p className="text-xs text-slate-600">打席に立っている選手が表示されます。</p>
              <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-1">
                <li>グラウンド図をタップして、<strong>打球位置</strong>を指定します（安打やアウトの種類に関わらず記録可能です）。</li>
                <li>結果ボタン（例: <code>単打</code> <code>三振</code> <code>四球</code>）を選択します。</li>
                <li><strong>「打席結果を記録」</strong>ボタンを押すと、結果が確定し、ランナーが自動配置され、次の打者に移ります。</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-sm text-red-600">守備時 (自チーム)</h4>
              <p className="text-xs text-slate-600">登板中の投手が選択されているか確認してください。</p>
              <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-1">
                <li>相手打者の打席結果を同様に入力します。</li>
                <li>失点や自責点が発生した場合は、<code>+</code>ボタンで加算してから記録します。</li>
                <li>3アウトになると自動的にチェンジ（攻守交替）のアナウンスが表示されます。</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <span className="bg-team-navy text-white w-6 h-6 rounded flex items-center justify-center text-sm">C</span>
            特殊操作 (走塁・投球・交代)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border p-3 rounded-lg bg-slate-50">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-1"><MoveRight size={16}/> 盗塁・牽制</h4>
              <p className="text-xs text-slate-600">
                <strong>打席結果を入力する前に</strong>、塁上のランナーボタン（1B/2B/3B）をタップします。
                <code>盗塁成功</code> <code>盗塁死</code> <code>牽制死</code> などを選択すると、その場で結果が反映されます。
              </p>
            </div>
            <div className="border p-3 rounded-lg bg-slate-50">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-1"><Grid3X3 size={16}/> 投球記録</h4>
              <p className="text-xs text-slate-600">
                「投球コース・結果入力」を開くと、1球ごとのデータを記録できます。
                コース(5x5)を選択 → 球種を選択 → 結果(<code>ボール</code> <code>見逃し</code>等)を選択します。
                カウントは自動で進み、四球や三振時は自動で打席結果が入力されます。
              </p>
            </div>
            <div className="border p-3 rounded-lg bg-slate-50">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-1"><Users size={16}/> 選手交代</h4>
              <p className="text-xs text-slate-600">
                <strong>代打:</strong> 「選手交代 / 代打」ボタンから選択します。<br/>
                <strong>守備交代・投手交代:</strong> 上部の「自チーム交代・守備」メニューから行います。投手交代はここで行うと、防御率などの計算が正しく引き継がれます。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Batch Input */}
      <div id="section-input-batch" className="space-y-6">
        <h2 className="text-2xl font-bold text-team-navy border-b-2 border-team-navy pb-2 flex items-center gap-2">
          <ClipboardList /> 2. 過去データ入力 (一括モード)
        </h2>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-sm text-slate-600 mb-4">
            スコアブックを見ながら、過去の試合結果をまとめて入力できます。
            「データ入力」タブで<span className="font-bold text-blue-600">野手一括</span>または<span className="font-bold text-red-600">投手一括</span>を選択してください。
          </p>
          <div className="space-y-3">
            <div className="flex gap-4 items-start border-b pb-3">
              <div className="min-w-[80px] font-bold text-sm">野手成績</div>
              <div className="text-xs text-slate-600">
                打数、安打数、打点、四死球などを入力して保存します。
                <br/><span className="text-red-500">※「四球」には敬遠を含めた総数を入力してください。「敬遠」欄は内数として扱われます。</span>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="min-w-[80px] font-bold text-sm">投手成績</div>
              <div className="text-xs text-slate-600">
                投球回、被安打、自責点などを入力します。
                「打たれた位置を記録」機能を使うと、被安打の傾向（スプレーチャート）も登録できます。
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Analysis */}
      <div id="section-analysis" className="space-y-6">
        <h2 className="text-2xl font-bold text-team-navy border-b-2 border-team-navy pb-2 flex items-center gap-2">
          <BarChart2 /> 3. 成績分析 (ダッシュボード)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border space-y-3">
            <h3 className="font-bold text-lg text-slate-800">基本機能</h3>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2">
              <li><strong>期間フィルタ:</strong> 「全期間」「月別」「期間指定」で集計範囲を変更できます。</li>
              <li><strong>チーム/スカウティング切替:</strong>
                <ul className="list-circle pl-4 mt-1 space-y-1">
                  <li><code>チーム分析</code>: 自チームの全試合の成績を表示。</li>
                  <li><code>対戦分析</code>: 特定の対戦相手との試合のみを集計。「あのチームには強い/弱い」が一目でわかります。</li>
                </ul>
              </li>
              <li><strong>CSV出力:</strong> 表示中の全データをExcel等で使えるCSV形式でダウンロードできます。</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border space-y-3">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Target size={20}/> 高度分析タブ</h3>
            <p className="text-xs text-slate-600">
              より詳細なデータ分析を行います。
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2">
              <li><strong>対戦条件フィルター:</strong> 「対右投手」「対左投手」や「特定の投手」との対戦成績に絞り込めます。</li>
              <li><strong>ヒートマップ:</strong> ストライクゾーンごとの打率、スイング率などを色分け表示します（投球データ入力時のみ有効）。</li>
              <li><strong>球種別スタッツ:</strong> ストレート、変化球ごとの打率や空振り率を確認できます。</li>
            </ul>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
          <strong><BookOpen size={16} className="inline mr-1"/> 指標ガイド</strong><br/>
          OPS, RC27, WHIPなどの専門用語については、ダッシュボード右上の「指標ガイド」ボタンから詳細な解説を確認できます。
        </div>
      </div>

      {/* 4. Settings */}
      <div id="section-settings" className="space-y-6">
        <h2 className="text-2xl font-bold text-team-navy border-b-2 border-team-navy pb-2 flex items-center gap-2">
          <SettingsIcon /> 4. 設定・データ管理
        </h2>
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><Users/> 選手管理</h3>
              <p className="text-xs text-slate-600">
                自チームの選手登録・編集・削除を行います。
                投打の左右や守備位置も登録しておくと、分析の精度が向上します。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><Shield/> 対戦相手管理</h3>
              <p className="text-xs text-slate-600">
                よく対戦する相手チームと、その主要選手を登録できます。
                相手選手を登録しておくと、スカウティング分析で「要注意打者」や「投手の傾向」を分析できるようになります。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><Save/> バックアップ</h3>
              <p className="text-xs text-slate-600">
                本アプリのデータはブラウザ内に保存されます。
                キャッシュクリア等での消失を防ぐため、定期的に「ファイルに保存」でJSONファイルをダウンロードしてください。
                復元する際はそのファイルを読み込むだけで元通りになります。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-10 text-slate-400 text-xs">
        IndieBall Stats Manager v1.0
      </div>
    </div>
  );
};
