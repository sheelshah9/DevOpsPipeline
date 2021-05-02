#!/bin/bash
curl -X POST -H "Content-Type: application/json" --data @survey.json http://192.168.44.20:3090/preview
