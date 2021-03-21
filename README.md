## Milestone 1 Report :

### Steps:
 - Create a .vault-pass file inside the root folder of DEVOPS-21 repository.
   - Content of this file -> csc-devops-2020
 - Commands to execute: 
    - npm install
    - npm link
    - pipeline setup
    - Pipeline build checkbox.io 

 `NOTE:` <br>
 `- Installing plugins will take 2-3 retries as it will wait for jenkins to be up.` <br>
 `- After jenkins gets restart, it will wait (5-6 retries) until jenkins web-interface is ready.`

### Issues and experiences:

 - #### Environment variables
    - We created environment variables in /etc/environment file. But when we triggered the build job, it showed “listening on port undefined” instead of 3002. Jenkins was not able to use the environment variable (/etc/environment) so we added an “admin” user of jenkins as sudoers which will give jenkins the permission to read environment variables. 

 - #### Workflow-aggregator (prior used pipeline-plugin but was not working)
    - Initially we used build-pipeline-plugin with freestyle projects which was difficult to convert into a pipeline style project.
Hence, we settled on using workflow-aggregator with DSL to make a pipeline. To generate the script for building the pipeline, we tried different combinations of commands.

 - #### Wscleanup:
    - In Jenkins everytime we trigger build, it creates a workspace inside /var/lib/jenkins and does all steps like cloning a repo, etc inside that workspace. Due to this, if we trigger build again, it gives an error “the checkbox.io repository already exists” during the git clone step and so to resolve it we need to clean/remove workspace at the end of pipeline execution so that the next time we trigger build it will run in the new workspace. For this we used ws-cleanup plugin and used it in post stage.

 - #### Build status using jenkins-log-stream
    - Using the log() function of jenkins-npm package does not provide us console-output and so to get full console view we used jenkins-log-stream which polls jenkins server every 1000 ms and shows full console-view.

 - #### Crumb unauthorized
    - During triggering build, it gives 403 forbidden errors. So for this we need to use crumb which will get valid for the current web session and so we can avoid forbidden error in that way.

### Screencast
 - [Milestone-1](https://www.youtube.com/watch?v=KBFULOgKfVI)
 
### Opunit checks
Some of the opunit checks performed by the TA are failing but we ran these checks in 3 different machines and they seem to be passing:  
![image](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/blob/master/opunit_tests.png)
