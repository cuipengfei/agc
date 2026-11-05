# GitHub Actions Billing Docs

> Source: https://docs.github.com/en/billing/concepts/product-billing/github-actions and https://docs.github.com/en/billing/reference/product-usage-included
> Collected: 2026-11-04
> Published: Unknown (repository live documents)

## Included compute usage and storage

The following included compute usage and storage amounts are included in your GitHub plan. The included compute usage resets at the start of each billing cycle.

| Plan                          | Artifact storage | Included compute usage (per month) | Cache storage (per repository) | Custom image storage |
| ----------------------------- | ---------------- | ---------------------------------- | ------------------------------ | -------------------- |
| GitHub Free                   | 500 MB           | $12 USD                            | 10 GB                          | Not applicable       |
| GitHub Pro                    | 1 GB             | $18 USD                            | 10 GB                          | Not applicable       |
| GitHub Free for organizations | 500 MB           | $12 USD                            | 10 GB                          | Not applicable       |
| GitHub Team                   | 2 GB             | $18 USD                            | 10 GB                          | 75 GB                |
| GitHub Enterprise Cloud       | 50 GB            | $300 USD                           | 10 GB                          | 150 GB               |

The included compute usage is expressed as a monetary amount, not a fixed number of minutes or other usage units. Products measure usage in different units, such as minutes, seconds, or GiB-seconds, and apply the corresponding rate. GitHub deducts the calculated cost from the same included compute usage. As a guide, $300 USD covers 50,000 minutes on a standard Linux runner at $0.006 USD per minute.

The use of standard GitHub-hosted runners is free:

- In public repositories
- For GitHub Pages
- For Dependabot

## Baseline minute costs

| Operating system                     | Billing SKU           | Per-minute rate (USD) |
| ------------------------------------ | --------------------- | --------------------- |
| Linux 1-core (x64)                   | `actions_linux_slim`  | $0.002                |
| Linux 2-core (x64)                   | `actions_linux`       | $0.006                |
| Linux 2-core (arm64)                 | `actions_linux_arm`   | $0.005                |
| Windows 2-core (x64)                 | `actions_windows`     | $0.010                |
| Windows 2-core (arm64)               | `actions_windows_arm` | $0.010                |
| macOS 3-core or 4-core (M1 or Intel) | `actions_macos`       | $0.062                |

## Key billing rules

- Standard GitHub-hosted runners in public repositories are free and do not reduce included compute usage.
- For private repositories, the calculated cost of eligible runner usage draws from the monthly included compute usage.
- The included compute usage is expressed as a monetary amount (e.g. $12 USD for GitHub Free), not a fixed number of minutes.
- Usage is charged to the repository owner, not the person who triggered the workflow runs.
