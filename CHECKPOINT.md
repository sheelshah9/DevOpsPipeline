##  Interim progress (03/09/2021)

> Checkpoint-1 tasks- [Milestone](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/milestone/1?closed=1) 

### Current progress
  - Developed Node.js project which will act as a driver to setup and run the pipeline commands.
  - Provisioned infrastructure(Config -srv) using bakerx with necessary configurations.
  - Installed Ansible on config-srv.
  - Developed roles in Ansible to install jenkins.
    - Installed java.
    - Configured port setting.
    - Automated setup wizard.
    - Created admin:admin user.



### Team contributions:
  - Develop nodejs project, provision vm - sshah28 [Issue-3](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/issues/3)
  - Install Ansible - bpatel24 [Issue-1](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/issues/1)
  - Install Jenkins on config-srv - nnparik2 [Issue-2](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/issues/2)
  - Automate setup wizard - bpatel24, sshah28 [Issue-7](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/issues/7)
  - Develop Roles in ansible - nnparik2, sshah28 [Issue-9](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/issues/9)


### Todo: (for milestone 1)
  - Configure MongoDB.
    - Port, user and IP settings.
  - Trigger Build job for jenkins.
    - setup build command: pipeline build checkbox.io -u admin -p admin
    - Clone checkbox.io repo, install dependencies, start mongodb and run tests.
  - Install necessary plugins in jenkins as required.  
  
### Notes:
  * nnparik2 had a commit made in the name of ultraultimated which is his github.com user id for [Issue-2](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/issues/2)
