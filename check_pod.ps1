$env:MINIKUBE_HOME = "D:\MinikubeData"
& "d:\Z_final_pbl\mini-balancer\bin\kubectl.exe" describe pod -l app=worker | Select-String -Pattern "Image|Pull|Error" -Context 1
