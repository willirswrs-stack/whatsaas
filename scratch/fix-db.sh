#!/bin/bash
docker exec whatsaas-postgres psql -U postgres -d wathsaas -c 'UPDATE plan SET "maxInstances" = 50;'
