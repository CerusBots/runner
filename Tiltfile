load('ext://pulumi', 'pulumi_resource')

update_settings(k8s_upsert_timeout_secs=600)

docker_build('ghcr.io/cerusbots/runner:latest', '.', dockerfile='./Dockerfile.dev', live_update=[
  sync('patches', '/usr/src/server/patches'),
  sync('src', '/usr/src/server/src'),
  sync('submodules', '/usr/src/server/submodules'),
  sync('package-lock.json', '/usr/src/server/package-lock.json'),
  sync('package.json', '/usr/src/server/package.json'),
  sync('tsconfig.json', '/usr/src/server/tsconfig.json'),
  run('npm i', trigger='package.json'),
  run('npm run build', trigger='submodules/common')
])

pulumi_resource('cerus-runner', stack='CerusBots/runner/dev', dir='deploy/pulumi', image_deps=['ghcr.io/cerusbots/runner:latest'], image_configs=['image'], labels=['cerus'])