# Scripts

The following scripts are exposed for use:

## Tag and Release

This script creates a Git tag and Github release for a given version. It is expected to be run as part of CI and only once for the given version defined in `package.json`.

NOTE: It can only be run on the `main` branch.

### Usage

```sh
# The following environment variable is expected. See the script itself for more details
#
#   GH_ACCESS_TOKEN - created through the Github UI with relevant permissions to the repo. S 

node @api3/commons/dist/scripts/tag-and-release.js my-repo-name
```
