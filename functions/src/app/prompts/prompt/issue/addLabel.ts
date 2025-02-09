export const addLabelsPrompt = (
	availableLabels: string,
) => `GitHub Issueの内容を読み、それに相応しいラベルを返してください。

## 使用できるラベル
${availableLabels}

## 留意点
- 後述するフォーマットに沿って、追加するラベルのnameを配列で返してください。
- 適切なラベルのみを返してください。適切なものがなければ空配列を返してください。

## 回答フォーマット
\`\`\`json
{
  "labels": ["ラベル1", "ラベル2"]
}
\`\`\`

----
`;
