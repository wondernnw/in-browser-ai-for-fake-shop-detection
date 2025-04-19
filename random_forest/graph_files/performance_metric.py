import matplotlib.pyplot as plt
import numpy as np

# Data from the table (excluding Time)
runs = range(1, 10)
precision = [0.864, 0.874, 0.938, 0.893, 0.893, 0.890, 0.937, 0.871, 0.917]
recall = [0.908, 0.880, 0.568, 0.876, 0.872, 0.891, 0.598, 0.899, 0.766]
f1 = [0.886, 0.877, 0.708, 0.884, 0.882, 0.891, 0.730, 0.885, 0.835]
accuracy = [0.883, 0.877, 0.765, 0.885, 0.883, 0.891, 0.779, 0.883, 0.849]
loss = [0.352, 0.377, 0.487, 0.329, 0.311, 0.311, 0.468, 0.352, 0.392]

# Average values (excluding Time)
avg_values = {
    'Precision': 0.897,
    'Recall': 0.806,
    'F1': 0.854,
    'Accuracy': 0.854,
    'Loss': 0.377
}

# Create figure with one plot
# Configurable figure size
fig_width = 16  # Default width
fig_height = 6  # Default height
fig, ax1 = plt.subplots(figsize=(fig_width, fig_height))

# Metrics across runs
ax1.plot(runs, precision, marker='o', label='Precision', color='#1f77b4')
ax1.plot(runs, recall, marker='s', label='Recall', color='#ff7f0e')
ax1.plot(runs, f1, marker='^', label='F1 Score', color='#2ca02c')
ax1.plot(runs, accuracy, marker='D', label='Accuracy', color='#d62728')
ax1.plot(runs, loss, marker='*', label='Loss', color='#9467bd')

ax1.set_xlabel('Run Number', fontsize=12)
ax1.set_ylabel('Value', fontsize=12)
ax1.set_xticks(runs)
ax1.grid(True, alpha=0.3)
ax1.legend(loc='best')

# Second subplot: Average values
#metrics = list(avg_values.keys())
#values = list(avg_values.values())
#colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']

#bars = ax2.bar(metrics, values, color=colors)
#ax2.set_title('Average Performance Metrics', fontsize=14)
#ax2.set_ylabel('Average Value', fontsize=12)
#ax2.grid(True, alpha=0.3, axis='y')

# Add values on top of bars
#for bar in bars:
    #height = bar.get_height()
    #ax2.text(bar.get_x() + bar.get_width()/2., height,
             #f'{height:.3f}',
             #ha='center', va='bottom')

plt.tight_layout()
plt.show()

# Save the figure in graph_files directory
fig.savefig('graph_files/performance_metrics_analysis.png', dpi=300, bbox_inches='tight')
