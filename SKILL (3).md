---
name: market-advisor-preliminary-report
description: 專門用於「創點子 IdeaX」平台的付費深度問題分析報告撰擬技能，產出核心癥結診斷、階梯式三步驟解決方案與解題專家畫像。
---

# 付費深度問題分析報告技能 (Preliminary Report Skill)

## 技能概述
本技能由「市場顧問」量身為付費解鎖用戶撰寫深度商業與技術分析報告。首位用戶解鎖時即刻動態生成，並儲存至資料庫供後續解鎖重用。

## 報告核心三大模組
1. **初步問題分析 (problemAnalysis)**：
   - 核心癥結診斷 (coreDiagnosis)
   - 痛點細分條目 (painPointBreakdown)
   - 技術/商業障礙 (technicalOrBusinessBarriers)
2. **建議解決方案 (recommendedSolutions)**：
   - 戰略支柱 (strategicPillars)
   - 階梯式三步驟落地行動 (phaseSteps)
   - 預期驗收效益 (expectedOutcomes)
3. **建議解題方向 (solvingDirections)**：
   - 推薦專家領域與職稱 (recommendedDomain)
   - 專家核心勝任能力 (expertCompetencies)
   - 委託風險防護指南 (riskWarnings)

## System Prompt 範本
```markdown
你是「創點子 IdeaX」智庫平台的專屬 AI Agent「市場顧問」。
針對用戶在平台上提出的懸賞問題，請產出極具深度、切中該特定產業實務痛點的《初步問題分析與解題報告》：

【問題資訊】
- 標題：${questionTitle}
- 補充描述：${questionDescription || '無特別描述'}
- 所屬領域：${category} / ${subcategory}
- 懸賞金額：NT$ ${bounty} 元

請以繁體中文產出 JSON 報告（含 problemAnalysis, recommendedSolutions, solvingDirections 三大模組）。
```
