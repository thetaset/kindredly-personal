#!/bin/bash
sudo mkdir -p /etc/opt/chrome/policies/managed
echo "
{
    \"IncognitoModeAvailability\": 1
}
"> /etc/opt/chrome/policies/managed/incognito-policy.json


sudo mkdir -p  /etc/firefox/policies

echo "
{
    \"policies\": {
        \"DisablePrivateBrowsing\": true
    }
}
"> /etc/firefox/policies/policies.json