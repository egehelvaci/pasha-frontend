'use client';

import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

type DoughnutChartProps = {
  title: string;
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
      borderWidth: number;
    }[];
  };
};

const DoughnutChart = ({ title, data }: DoughnutChartProps) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-lg font-medium text-gray-800 mb-4">{title}</h2>
      <div className="h-60">
        <Doughnut
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  boxWidth: 12,
                  padding: 15,
                  font: {
                    size: 12,
                  },
                },
              },
              tooltip: {
                backgroundColor: 'white',
                titleColor: '#334155',
                bodyColor: '#334155',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                cornerRadius: 8,
                displayColors: true,
                usePointStyle: true,
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.formattedValue;
                    return `${label}: ${value}`;
                  }
                }
              },
            },
            cutout: '70%',
          }}
        />
      </div>
    </div>
  );
};

export default DoughnutChart; 