import { LineChart, RadarChart } from 'echarts/charts';
import { GridComponent, LegendComponent, MarkLineComponent, MarkPointComponent, RadarComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';
// The ES module build: the CommonJS one (lib/) arrives wrapped in an object in production builds.
import ReactEChartsCore from 'echarts-for-react/esm/core';
import type { ChartColors } from './chartTheme';
import { useThemeColors } from '@/theme/usePalette';

echarts.use([LineChart, RadarChart, GridComponent, LegendComponent, MarkLineComponent, MarkPointComponent, RadarComponent, TooltipComponent, SVGRenderer]);


type ChartProps = {
  /** Builds the chart from the current theme's colors. */
  option: (c: ChartColors) => EChartsCoreOption;
  height: number;
  /** What the chart shows, for screen readers (the chart itself is decorative to them). */
  label: string;
  className?: string;
};

/** An ECharts chart in the app's colors, redrawn when the theme changes. */
export function Chart({ option, height, label, className }: ChartProps) {
  const colors = useThemeColors();
  return (
    <div role="img" aria-label={label} className={className}>
      <ReactEChartsCore
        echarts={echarts}
        option={option(colors)}
        notMerge
        lazyUpdate
        style={{ height, width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}
