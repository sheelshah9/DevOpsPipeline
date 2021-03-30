##  Interim progress (03/29/2021)

> Checkpoint for Milestone2 tasks- [Milestone](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/milestone/2?closed=1) 

### Current progress
  - Updated ansible roles to create iTrust-job environment.
      - Installed Maven, MySql.
      - Added cloudbees-credentials jenkins-plugin for credential management and jacoco for code coverage reports.
      - Added jenkins job yml for iTrust.
      - create admin:admin user for MySql.
  - Configured Jenkins credential manager to store github account credentials.
  - Updated setup.js to capture extra arguments (github user and password) for authentication.
  - Build iTrust pipeline to run unit and integration test and generate code coverage report.


### Team contributions:
  - Jenkins Credentials Management and github authentication  - nnparik2, sshah28  [Issue-16](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/issues/16)
  - Build Job for iTrust Application  - sshah28, bpatel24 [Issue-18](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/issues/18)
  - configure Build Environment for iTrust - bpatel24 [Issue-17](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/issues/17)


### Todo: (for milestone 1)
  - Perform cleanup step after running build for iTrust Application.
    - Drop DB and kill any remaining chrome or jetty processes.
  - Implement fuzzing test.
  - Implement a static analysis for checkbox.io.  
  - Create new commands to run fuzzing test:
    - pipeline useful-tests -c 1000 --gh-user <username> --gh-pass <password>

  
### Notes:
  * sshah28 had a commit made in the name of sheelshah9 which is his github.com user id for [Issue-18](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-21/issues/18)
