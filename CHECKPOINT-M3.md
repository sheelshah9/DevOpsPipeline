##  Interim progress (04/26/2021)

> Checkpoint for Milestone3 tasks- [Milestone](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/milestone/3?closed=1) 

### Current progress
  - Created prod.js to automate the following tasks:
    - Provision three instances that will be used: 
        - To deploy iTrust.
        - To deploy the checkbox.io app.
        - To setup monitoring infrastructure.
    - create inventory.ini with the information (IP address) of cloud resources that we created in Digital Ocean.
    - create playbooks to configure the 3 instances.

### Team contributions:
  - Provisioning of instances in Digital Ocean  - nnparik2  [Issue-28](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/issues/28)
  - Added code to create inventory.ini file for cloud resources information - bpatel24 [Issue-29](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/issues/29)
  - Created playbooks to configure instances and updated ansible role to copy private key which will be used by config-srv to access droplets - sshah28 [Issue-30](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/issues/30)


### Todo: (for milestone 3)
  - Add tasks in the playbook to deploy iTrust application.
    - create a WAR file using mvn package.
    - install all dependencies to deploy the application.
  - Configure Nginx to deploy checkbox.io app.
  - perform canary analysis.
 
