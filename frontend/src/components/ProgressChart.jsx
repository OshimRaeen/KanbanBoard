import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { computeProgressStats } from "../utils/taskHelpers";

function ProgressChart({ tasks }) {
  const stats = computeProgressStats(tasks);

  return (
    <div className="progress-chart" data-testid="progress-chart">
      <div className="progress-chart__header">
        <h3>Progress</h3>
        <span data-testid="completion-percent">{stats.completionPercent}% complete</span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={stats.byColumn}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ProgressChart;
