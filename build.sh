#!/bin/bash -x
. /usr/local/rvm/scripts/rvm

# check installed ruby version
installed_ruby_version_count=$(rvm list | grep -f .ruby-version | wc -l)
if [ $installed_ruby_version_count != 1 ]; then
  echo 'Ruby version specified in .ruby-version is not installed on this build box.'
  exit 1
fi

if  [ $1 != 'dev' ]; then
  sed -i'' -e 's/repo.snapshot.cerner.corp/repo.nightly.cerner.corp/' Gemfile
fi

# verify that no thrift files are without ruby namespace
while read line; do
if ! curl --silent $line | grep --quiet rb; then
echo "THRIFT FILE NOT NAMESPACED"
echo $line
set -e
break;
fi
done < <(grep .thrift project.yml | sed s/..-.//)

. "/etc/profile.d/rvm.sh"
# install appropriate Ruby and use/create gemset
rvm_trust_rvmrcs_flag=1
rvm use .
echo `rvm current`
rvm --force gemset empty

# update dependencies
rm -rf cerner_gems
curl -O http://github.cerner.com/ion-server-core/Ecosystem/raw/master/jenkins/cerner_gems
chmod +x cerner_gems
eval $(./cerner_gems)

# install gems
bundle install

# inform roll_out-security to update bundler-audit if it is installed
export BUNDLE_AUDIT_UPDATE=1

# clobber any artifacts
bundle exec rake clobber

deploy_options="bundle exec rake deploy"

if [ ! -z $2 ] && [ $2 = 'dry_run' ]; then
  deploy_options="$deploy_options DRY_RUN=true"
fi

if [ $1 = 'dev' ]; then
  deploy_options="$deploy_options --trace"
else
  deploy_options="$deploy_options REPOSITORY=exodus-nightly::http://repo.nightly.cerner.corp/nexus/content/repositories/exodus-nightly-repo/ SITE_REPOSITORY=exodus-nightly-site::http://repo.nightly.cerner.corp/nexus/content/repositories/exodus-nightly-site/"
fi

eval "$deploy_options"
