# Multi-Cluster Feature Validation Guide

## Step 1: Import Clusters into Browser

Your Kubernetes Admin UI should now be running at http://localhost:5173

### Method 1: Using Browser Console
1. Open Developer Tools (F12)
2. Go to the Console tab
3. Copy and paste the contents of `workspace/import-clusters.js`:

```javascript
// Paste this in the browser console to import clusters
localStorage.setItem('kubernetes-clusters', "[{\"config\":{\"id\":\"rfzetgryzmfu6zyod\",\"name\":\"admin@talos-cluster\",\"displayName\":\"Talos 3-Node Cluster\",\"description\":\"3-node Talos control plane cluster\",\"server\":\"https://*************:6443\",\"provider\":\"local\",\"environment\":\"development\",\"tags\":{\"imported\":\"true\",\"source\":\"workspace\",\"file\":\"kubeconfig-talos-3-noeuds\"},\"createdAt\":\"2025-09-21T21:11:26.029Z\",\"updatedAt\":\"2025-09-21T21:11:26.029Z\",\"isDefault\":true},\"auth\":{\"clusterId\":\"rfzetgryzmfu6zyod\",\"type\":\"kubeconfig\",\"kubeconfig\":\"apiVersion: v1\\nclusters:\\n- cluster:\\n    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJpVENDQVRDZ0F3SUJBZ0lSQU5teVdBRmMzYXVJN1NpYWNybGJhSmN3Q2dZSUtvWkl6ajBFQXdJd0ZURVQKTUJFR0ExVUVDaE1LYTNWaVpYSnVaWFJsY3pBZUZ3MHlOVEE1TWpFeE5ETTNORFphRncwek5UQTVNVGt4TkRNMwpORFphTUJVeEV6QVJCZ05WQkFvVENtdDFZbVZ5Ym1WMFpYTXdXVEFUQmdjcWhrak9QUUlCQmdncWhrak9QUU1CCkJ3TkNBQVNpZXJwdEt0aU5IWnNCRnppdXMyUlBtSXhxSFVlaXozaUVpcUNhbFY2RzhjMUZaOEZUM00xNVdOQXEKdlltTzFtc0pITDdPaUoxYzBEWkhpLytkVVFRS28yRXdYekFPQmdOVkhROEJBZjhFQkFNQ0FvUXdIUVlEVlIwbApCQll3RkFZSUt3WUJCUVVIQXdFR0NDc0dBUVVGQndNQ01BOEdBMVVkRXdFQi93UUZNQU1CQWY4d0hRWURWUjBPCkJCWUVGSnpTL3RLbTk1WUtrbzNrZmk0ME9mMXY1YVJHTUFvR0NDcUdTTTQ5QkFNQ0EwY0FNRVFDSUJaRjlIYWkKSmR6cmNMQnB5bzhjd3BmM2Y1eGhXRUxsQXUxWkZZY3M3Z2tNQWlBa3ZibndLeVFvTTRsNmhBVER4dTNKWGFnSgpVVnV4Q050aitlU3lUWmoxRHc9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==\\n    server: https://*************:6443\\n  name: talos-cluster\\ncontexts:\\n- context:\\n    cluster: talos-cluster\\n    namespace: default\\n    user: admin@talos-cluster\\n  name: admin@talos-cluster\\ncurrent-context: admin@talos-cluster\\nkind: Config\\nusers:\\n- name: admin@talos-cluster\\n  user:\\n    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJoRENDQVN1Z0F3SUJBZ0lSQUxpYVJBOTZCeXJROFpiTGx2RVNtOWd3Q2dZSUtvWkl6ajBFQXdJd0ZURVQKTUJFR0ExVUVDaE1LYTNWaVpYSnVaWFJsY3pBZUZ3MHlOVEE1TWpFeU1EVXpNVGhhRncweU5qQTVNakV5TURVegpNamhhTUNreEZ6QVZCZ05WQkFvVERuTjVjM1JsYlRwdFlYTjBaWEp6TVE0d0RBWURWUVFERXdWaFpHMXBiakJaCk1CTUdCeXFHU000OUFnRUdDQ3FHU000OUF3RUhBMElBQkNBaVZRSXdjeXlWb1ZXVkVrOURLY1Via0M3dnAvYjQKTVNJeE4vRGY0STYwZ0kwdDUrNkEwUnJIN3c2YUM1K25PbkFsWGdDeXdVd1ZwRWM3T3daWnBXR2pTREJHTUE0RwpBMVVkRHdFQi93UUVBd0lGb0RBVEJnTlZIU1VFRERBS0JnZ3JCZ0VGQlFjREFqQWZCZ05WSFNNRUdEQVdnQlNjCjB2N1NwdmVXQ3BLTjVINHVORG45YitXa1JqQUtCZ2dxaGtqT1BRUURBZ05IQURCRUFpQkZXbmVPczdCK1lMVEkKcy9FRGRmL1UyN2NhTlFkTmFyMHpwV3VyTnJ5SjhRSWdVUTB5OEZTTy9HalF4aVZoNjAzeUpRWTRML2h3UE5seQpxYmZzYmtHS3VxRT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=\\n    client-key-data: LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1IY0NBUUVFSUxsOUs1WG5WZkZIS21SMGwzeklLejl4ZzNSbHFaWEc2THFaeTNiem82SmtvQW9HQ0NxR1NNNDkKQXdFSG9VUURRZ0FFSUNKVkFqQnpMSldoVlpVU1QwTXB4UnVRTHUrbjl2Z3hJakUzOE4vZ2pyU0FqUzNuN29EUgpHc2Z2RHBvTG42YzZjQ1ZlQUxMQlRCV2tSenM3QmxtbFlRPT0KLS0tLS1FTkQgRUMgUFJJVkFURSBLRVktLS0tLQo=\\n\",\"namespace\":\"default\"},\"status\":{\"clusterId\":\"rfzetgryzmfu6zyod\",\"status\":\"unknown\",\"lastChecked\":\"2025-09-21T21:11:26.029Z\"}},{\"config\":{\"id\":\"dnmz589o6mfu6zyoe\",\"name\":\"admin@talos-default\",\"displayName\":\"Talos Local Cluster\",\"description\":\"Local Talos cluster with 1 control plane and 2 workers\",\"server\":\"https://*********:65327\",\"provider\":\"local\",\"environment\":\"development\",\"tags\":{\"imported\":\"true\",\"source\":\"workspace\",\"file\":\"kubeconfig-talosctl-cluster-local\"},\"createdAt\":\"2025-09-21T21:11:26.030Z\",\"updatedAt\":\"2025-09-21T21:11:26.030Z\",\"isDefault\":false},\"auth\":{\"clusterId\":\"dnmz589o6mfu6zyoe\",\"type\":\"kubeconfig\",\"kubeconfig\":\"apiVersion: v1\\nclusters:\\n- cluster:\\n    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJpekNDQVRDZ0F3SUJBZ0lSQUxyZS91cm1yMnVBWWFDeGJjQzRHUE13Q2dZSUtvWkl6ajBFQXdJd0ZURVQKTUJFR0ExVUVDaE1LYTNWaVpYSnVaWFJsY3pBZUZ3MHlOVEE1TWpBeU1qSXdNalZhRncwek5UQTVNVGd5TWpJdwpNalZhTUJVeEV6QVJCZ05WQkFvVENtdDFZbVZ5Ym1WMFpYTXdXVEFUQmdjcWhrak9QUUlCQmdncWhrak9QUU1CCkJ3TkNBQVRLbHlBK3Ntc29VeER3UEVOMXVaTGU4THJqWklJbW1RVWcwVGxYYkNTR1RDWnV3Rll0VHhSRE81QTYKc2tBYTJmQ3IvaEZyd1pMZVYvejNNVEZuRm12Vm8yRXdYekFPQmdOVkhROEJBZjhFQkFNQ0FvUXdIUVlEVlIwbApCQll3RkFZSUt3WUJCUVVIQXdFR0NDc0dBUVVGQndNQ01BOEdBMVVkRXdFQi93UUZNQU1CQWY4d0hRWURWUjBPCkJCWUVGSnpLanF6MmhIYkNCQlZUZzkvWVJua2c1TlI1TUFvR0NDcUdTTTQ5QkFNQ0Ewa0FNRVlDSVFDa3JISGcKM0k1V0Y5ZlQxL1JHK1ZFNnVjN05nRUtMQ2tyOWMwdDZ4dHF3NEFJaEFPeGR6OTExS1FhcCtPWG5xODA1MU83UgprUmNWT25jVHhTZTQwekpCUDBRZgotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==\\n    server: https://*********:65327\\n  name: talos-default\\ncontexts:\\n- context:\\n    cluster: talos-default\\n    namespace: default\\n    user: admin@talos-default\\n  name: admin@talos-default\\ncurrent-context: admin@talos-default\\nkind: Config\\nusers:\\n- name: admin@talos-default\\n  user:\\n    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJoakNDQVN1Z0F3SUJBZ0lSQU45cVRIWnJVa25QcC82bTJUbTB3dHd3Q2dZSUtvWkl6ajBFQXdJd0ZURVQKTUJFR0ExVUVDaE1LYTNWaVpYSnVaWFJsY3pBZUZ3MHlOVEE1TWpBeU1qSXdORGhhRncweU5qQTVNakF5TWpJdwpOVGhhTUNreEZ6QVZCZ05WQkFvVERuTjVjM1JsYlRwdFlYTjBaWEp6TVE0d0RBWURWUVFERXdWaFpHMXBiakJaCk1CTUdCeXFHU000OUFnRUdDQ3FHU000OUF3RUhBMElBQk02T3JkaTZsenQraC94eXd1ZXNXZDFpNW5aZnhZWXUKODNGNmFYdDZCTFZ6RmZXZWFxMGRMSXVGcTFEOHlwdTgrRm5rQmVYUzFXZWhvNTFMOHNLZTc1eWpTREJHTUE0RwpBMVVkRHdFQi93UUVBd0lGb0RBVEJnTlZIU1VFRERBS0JnZ3JCZ0VGQlFjREFqQWZCZ05WSFNNRUdEQVdnQlNjCnlvNnM5b1Iyd2dRVlU0UGYyRVo1SU9UVWVUQUtCZ2dxaGtqT1BRUURBZ05KQURCR0FpRUFqRmpYM2VRNm9LT0MKdzhBWEt6am0wcFdZckd1dHJMQVpJcGFTYzZvUjlQOENJUURZSzNVcXVBSVdaNUwrejJYUExBMUNDSFBGdlBxNwpGM2M3WmdSaTd4bkV2QT09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K\\n    client-key-data: LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1IY0NBUUVFSUxtRUU0dnFCTVdscEdNL2lVZUhkc3ptaUZLUmxmdGFXUmVvdXFmN2lKSU1vQW9HQ0NxR1NNNDkKQXdFSG9VUURRZ0FFem82dDJMcVhPMzZIL0hMQzU2eFozV0xtZGwvRmhpN3pjWHBwZTNvRXRYTVY5WjVxclIwcwppNFdyVVB6S203ejRXZVFGNWRMVlo2R2puVXZ5d3A3dm5BPT0KLS0tLS1FTkQgRUMgUFJJVkFURSBLRVktLS0tLQo=\\n\",\"namespace\":\"default\"},\"status\":{\"clusterId\":\"dnmz589o6mfu6zyoe\",\"status\":\"unknown\",\"lastChecked\":\"2025-09-21T21:11:26.030Z\"}}]");
console.log('✅ Clusters imported! Refresh the page to see them.');
```

4. Press Enter to execute
5. You should see "✅ Clusters imported! Refresh the page to see them."
6. Refresh the page (F5 or Cmd+R)

### Method 2: Using LocalStorage via Application Tab
1. Open Developer Tools (F12)
2. Go to Application tab
3. In the sidebar, expand "Storage" → "Local Storage"
4. Click on your app's URL (http://localhost:5173)
5. Click the "+" button to add a new key
6. Set Key: `kubernetes-clusters`
7. Set Value: Copy the JSON content from `workspace/imported-clusters.json`
8. Refresh the page

## Step 2: Validate Multi-Cluster Features

After importing the clusters, you should see:

### 🎯 Expected UI Elements:
- **Cluster Selector**: A dropdown in the header/navigation showing the current cluster
- **Cluster Status Indicators**: Visual status (connected/disconnected/unknown)
- **Provider Icons**: Local/cloud provider indicators

### 🧪 Test Scenarios:

1. **Cluster Switching**:
   - Use the cluster selector dropdown to switch between "Talos 3-Node Cluster" and "Talos Local Cluster"
   - Verify that the current cluster name updates in the UI
   - Check that cluster switch events are logged in console

2. **Cluster Management**:
   - Access the cluster manager (if available in navigation)
   - Verify both imported clusters are listed
   - Test the following actions:
     - ✅ View cluster details
     - ✅ Refresh cluster status
     - ✅ Set default cluster
     - ✅ Edit cluster configuration
     - ✅ Clone cluster configuration
     - ✅ Delete cluster (with confirmation)

3. **Health Monitoring**:
   - Watch for automatic health check polls (should happen every 30 seconds)
   - Cluster statuses should update from "unknown" to "connected" or "disconnected"
   - Check browser console for health check logs

4. **Persistence**:
   - Refresh the page - clusters should remain imported
   - Switch clusters, refresh, verify the last selected cluster is remembered

## Step 3: Testing Real Cluster Connectivity

⚠️ **Note**: The imported clusters use real kubeconfig data but may not be accessible if the Talos clusters are not running.

To test real connectivity:
1. Ensure your Talos clusters are running and accessible
2. Verify network connectivity to the cluster endpoints
3. The health checks should eventually show "connected" status

## Step 4: Troubleshooting

### Common Issues:
- **Clusters not appearing**: Check localStorage contains the data and refresh
- **Status stuck on "unknown"**: Check network connectivity and cluster availability
- **Console errors**: Check for CORS issues or network timeouts

### Debug Commands:
```javascript
// Check imported clusters
console.log(JSON.parse(localStorage.getItem('kubernetes-clusters')));

// Check cluster context state (if available)
// This depends on your React DevTools setup
```

## 🎉 Success Criteria

Your multi-cluster feature is working correctly if you can:
- ✅ See both imported Talos clusters in the UI
- ✅ Switch between clusters using the selector
- ✅ Access cluster management functionality
- ✅ Observe health status updates
- ✅ Persist cluster selection across page refreshes

## Next Steps

Once validated, consider:
1. Implementing cluster configuration forms for adding new clusters
2. Adding real API integration for cluster operations
3. Enhancing the cluster management UI with more detailed views
4. Adding cluster import/export functionality
5. Implementing cluster-aware routing and context switching

---

**Happy Testing! 🚀**