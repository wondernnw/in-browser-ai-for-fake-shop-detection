import matplotlib.pyplot as plt
import numpy as np

# Data from the table
models = ['RF', 'DFFN']
metrics = ['Precision', 'Recall', 'F1 Score', 'Accuracy', 'Loss']
rf_values = [0.931, 0.914, 0.923, 0.925, 0.349]
dffn_values = [0.899, 0.802, 0.841, 0.854, 0.377]

# Bar positions
x = np.arange(len(metrics))  # Positions for metrics
width = 0.35  # Width of bars

# Create the plot
fig, ax = plt.subplots(figsize=(10, 6))

# Plot bars for RF and DFFN
bars_rf = ax.bar(x - width/2, rf_values, width, label='RF', color='#1f77b4')  # blue for RF
bars_dffn = ax.bar(x + width/2, dffn_values, width, label='DFFN', color='#ff7f0e')  # orange for DFFN

# Add labels and title
ax.set_xlabel('Metrics', fontsize=12)
ax.set_ylabel('Values', fontsize=12)
ax.set_xticks(x)
ax.set_xticklabels(metrics)
ax.legend()

# Add values on top of bars
for bars in [bars_rf, bars_dffn]:
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.3f}',
                ha='center', va='bottom')

# Show grid for better readability
ax.grid(True, alpha=0.3)

# Adjust layout and display the plot
plt.tight_layout()
plt.show()
# Save the figure in graph_files directory
fig.savefig('graph_files/rf_dffn_comparison.png', dpi=300, bbox_inches='tight')