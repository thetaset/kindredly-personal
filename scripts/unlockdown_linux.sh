#!/bin/bash
sudo mkdir -p /etc/opt/chrome/policies/managed
echo "
{
    \"IncognitoModeAvailability\": 0
}
"> /etc/opt/chrome/policies/managed/incognito-policy.json


sudo mkdir -p  /etc/firefox/policies

echo "
{
    \"policies\": {
        \"DisablePrivateBrowsing\": false
    }
}
"> /etc/firefox/policies/policies.json