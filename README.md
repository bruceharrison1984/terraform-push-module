# terraform-push-module

> [!IMPORTANT]  
> This Github Action will upload a **private** Terraform module to HCP Terraform or Terraform Enterprise.
>
> **Public modules are not supported since the workflow doesn't make sense for a CI/CD context.**

- The module _must_ adhere to [Hashicorp Standard Module guidelines](https://developer.hashicorp.com/terraform/language/modules/develop/structure)
- Only single modules can be used, module mono-repos are not supported
- Only `**/*.tf` and `**/README.md` will be included in the uploaded bundle
  - Nested sub-modules will be included in the bundle
- Version numbers are entirely managed by you, there is no auto-incrementing

## Configuration

### Inputs

| Setting          | Description                                                            | Example                      | Required |
| ---------------- | ---------------------------------------------------------------------- | ---------------------------- | -------- |
| serverUri        | The root URI of the HCP Terraform/Enterprise server                    | `https://app.terraform.io`   | Y        |
| organizationName | The name of the organization this module belongs to                    | `my-org`                     | Y        |
| moduleName       | The name of the module                                                 | `my-special-module`          | Y        |
| versionString    | The version tag that will be applied to the module (semver-compatible) | `v1.0.1 \| 1.0.1`            | Y        |
| providerName     | The name of the provider associated with this module                   | `aws \| gcp \| azure \| etc` | Y        |
| authToken        | HCP/TFE token with sufficient permissions to manage modules            | `<hcp-token>`                | Y        |
| isNoCode         | Enable `no-code` workflows for this module. Default is `false`         | `true/false`                 | Y        |

### Outputs

| Name            | Description                                                                             |
| --------------- | --------------------------------------------------------------------------------------- |
| archiveFilepath | The file path to the tarball that contains the module code that was uploaded to HCP/TFE |
| moduleVersion   | The name of the module that was created                                                 |
| moduleName      | The version number of the module that was created                                       |

## Example

> [!TIP]  
> Utilize the `actions/upload-artifact` action to save the module tarball as a GitHub artifact after upload to TFC/TFE

```yaml
name: Terraform Module Push

on:
  workflow_dispatch:

jobs:
  actionlint:
    name: Push Terraform Module
    runs-on: ubuntu-22.04
    steps:
      - name: Checkout
        uses: actions/checkout@44c2b7a8a4ea60a981eaca3cf939b5f4305c123b # v4.1.5
      - id: terraform-push-module
        uses: bruceharrison1984/terraform-push-module@main ## ensure using latest version
        with:
          serverUri: https://app.terraform.io
          organizationName: my-hcp-org
          moduleName: gcp-artifact-registry
          authToken: ${{ secrets.TFE_TOKEN }} ## token should be securely stored in GitHub Secrets
          providerName: aws
          versionString: v0.0.2 ## version should be sourced from environment
          isNoCode: "false"
      ## optionally save the tarball to Github Artifacts
      - uses: actions/upload-artifact@v4
        with:
          name: ${{ steps.terraform-push-module.outputs.moduleName }}@${{ steps.terraform-push-module.outputs.moduleVersion }}
          path: ${{ steps.terraform-push-module.outputs.archiveFilepath }}
```

## Job Summary

A detailed job summary and link to the created module can be found in the Github Action Summary page:
![summary_preview](/media/summary_preview.jpg)
