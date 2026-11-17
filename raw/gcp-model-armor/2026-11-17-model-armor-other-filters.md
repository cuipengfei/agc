# Google Cloud Model Armor 其他过滤器：官方文档摘录

> Source: https://docs.cloud.google.com/model-armor/overview; https://docs.cloud.google.com/model-armor/overview?hl=zh-cn
> Collected: 2026-11-17
> Published: Unknown

## 官方过滤器清单

> Responsible AI safety filter

> Prompt injection and jailbreak detection

> Sensitive Data Protection

> Malicious URL detection

> Child sexual abuse material (CSAM) detection

> Filter toxic or harmful content: Screen user inputs and model outputs against configurable confidence thresholds for hate speech, harassment, sexual content, dangerous content, and child sexual abuse material (CSAM).

> You can set confidence levels for responsible AI safety categories (sexually explicit, dangerous, harassment, and hate speech), prompt injection and jailbreak detection, CSAM detection, and sensitive data protection (including topicality).

## Responsible AI safety filter

| Category | Definition |
|---|---|
| Hate speech | Negative or harmful comments targeting identity and/or protected attributes. |
| Harassment | Threatening, intimidating, bullying, or abusive comments targeting another individual. |
| Sexually explicit | Contains references to sexual acts or other lewd content. |
| Dangerous content | Promotes or enables access to harmful goods, services, and activities. |

## Sensitive Data Protection

> Redact sensitive data and mitigate leakage: Scan and redact sensitive intellectual property (IP) or personally identifiable information (PII) from prompts and model responses using Sensitive Data Protection.

> Model Armor offers two modes for Sensitive Data Protection configuration:

> Basic configuration: In this mode, you configure Sensitive Data Protection by specifying the types of sensitive data to scan for. This mode supports the following categories:
> Credit card number
> US social security number (SSN)
> Financial account number
> US individual taxpayer identification number (ITIN)
> Google Cloud credentials
> Google Cloud API key

> Basic configuration only supports inspection operations and doesn't support the use of Sensitive Data Protection templates.

> Advanced configuration: This mode offers more flexibility and customization through Sensitive Data Protection templates. Sensitive Data Protection templates are predefined configurations that let you specify more granular detection rules and de-identification techniques. Advanced configuration supports both inspection and de-identification operations.

> Confidence levels for Sensitive Data Protection operate differently than confidence levels for other filters. For more information about confidence levels for Sensitive Data Protection, see Sensitive Data Protection match likelihood.

## Malicious URL detection

> Malicious URLs are often disguised to look legitimate, making them a potent tool for phishing attacks, malware distribution, and other online threats. For example, if a PDF contains an embedded malicious URL, it can be used to compromise any downstream systems processing LLM outputs.

> When malicious URL detection is enabled, Model Armor scans URLs to identify whether they're malicious. This lets you take action and prevent malicious URLs from being returned.

> Model Armor extracts URLs until it reaches 256 URLs or the end of the payload, and scans only the first 256 URLs found in prompts and responses.

## Child sexual abuse material (CSAM) detection

> Child sexual abuse material (CSAM) detection screens prompts and responses for content related to child sexual abuse material.

> When CSAM detection is enabled, Model Armor scans prompts and responses and flags violations based on the confidence level that you specify. You can enable or disable the CSAM filter and configure its confidence level (`High`, `Medium and above`, or `Low and above`) in Model Armor templates and floor settings.

> If you don't specify CSAM filter settings, Model Armor applies the following default behavior:

> Floor settings: Because floor settings are global resources, CSAM detection is enabled by default with a `High` confidence level.

> Templates:
> In regions that support CSAM detection, or when data residency compliance is disabled, CSAM detection is enabled by default with a `High` confidence level.
> In regions that don't support CSAM detection, when data residency compliance is enabled, CSAM detection is disabled by default. In these regions, you can't create or update a template with CSAM detection enabled unless you disable data residency compliance in the template.

> You can configure the CSAM filter only by using the Model Armor API. Configuring the CSAM filter isn't available in the Google Cloud console.

### 中文 overview 的 CSAM 说法

> 儿童性虐待内容 (CSAM) | 包含对儿童性虐待内容的引用。此过滤条件默认处于启用状态，并且无法关闭。

## 输入形态

> Document screening

> Image screening
