import matplotlib.pyplot as plt

# Corrected data
features = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
acc_rf = [0.925, 0.923, 0.918, 0.918, 0.914, 0.911, 0.910, 0.913, 0.888, 0.865, 0.841]
acc_dn = [0.886, 0.880, 0.869, 0.863, 0.841, 0.836, 0.813, 0.806, 0.809, 0.777, 0.730]
loss_rf = [0.349, 0.325, 0.315, 0.282, 0.339, 0.334, 0.370, 0.523, 0.564, 0.869, 2.176]
loss_dn = [0.311, 0.340, 0.361, 0.397, 0.418, 0.466, 0.479, 0.477, 0.488, 0.452, 0.500]

# Create subplots
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

# Accuracy plot
ax1.plot(features[::-1], acc_rf[::-1], marker='o', label='Acc RF')
ax1.plot(features[::-1], acc_dn[::-1], marker='o', label='Acc DN')
ax1.set_xlabel('Number of Features')
ax1.set_ylabel('Accuracy')
ax1.legend()
ax1.grid(True, color='lightgray')  
ax1.set_xticks(features[::-1])   # Explicitly set x-ticks
ax1.set_xlim(11 + .5 , .5) # Invert x-axis to show descending order

# Loss plot
ax2.plot(features[::-1], loss_rf[::-1], marker='o', label='Loss RF')
ax2.plot(features[::-1], loss_dn[::-1], marker='o', label='Loss DN')
ax2.set_xlabel('Number of Features')
ax2.set_ylabel('Loss')
ax2.legend()
ax2.grid(True,color='lightgray')  
ax2.set_xticks(features[::-1])   # Explicitly set x-ticks
ax2.set_xlim(11 + .5 , .5) # Invert x-axis to show descending order

plt.tight_layout()
plt.show()

# Save the figure in graph_files directory
fig.savefig('graph_files/feature_selection_analysis.png', dpi=300, bbox_inches='tight')
