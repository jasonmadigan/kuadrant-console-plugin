import { usePrometheusPoll, PrometheusEndpoint } from '@openshift-console/dynamic-plugin-sdk';

interface GatewayMetrics {
  total?: number;
  errors?: number;
  codes?: {
    [responseCode: string]: number;
  };
}

export interface GatewayMetricsMap {
  [gatewayName: string]: GatewayMetrics;
}

interface UseGatewayMetricsResult {
  metrics: GatewayMetricsMap;
  loaded: boolean;
  error: boolean;
}

export const useGatewayMetrics = (): UseGatewayMetricsResult => {
  const [totalRequestsRes, totalRequestsLoaded, totalRequestsError] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query:
      'sum by (source_workload, source_workload_namespace) (increase(istio_requests_total[24h]))',
  });
  const [totalErrorsRes, totalErrorsLoaded, totalErrorsError] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query:
      'sum by (source_workload, source_workload_namespace) (increase(istio_requests_total{response_code!~"2(.*)|3(.*)"}[24h]))',
  });
  const [totalErrorsByCodeRes, totalErrorsByCodeLoaded, totalErrorsByCodeError] = usePrometheusPoll(
    {
      endpoint: PrometheusEndpoint.QUERY,
      query:
        'sum by (response_code, source_workload, source_workload_namespace) (increase(istio_requests_total{response_code!~"2(.*)|3(.*)"}[24h]))',
    },
  );

  const metrics: GatewayMetricsMap = {};

  const getGateway = (name: string): GatewayMetrics => {
    if (!metrics[name]) {
      metrics[name] = {};
    }
    return metrics[name];
  };

  if (!totalRequestsError && totalRequestsLoaded) {
    totalRequestsRes.data.result.forEach((item) => {
      const gatewayName = `${item.metric.source_workload_namespace}/${item.metric.source_workload}`;
      getGateway(gatewayName).total = parseFloat(item.value[1]);
    });
  }
  if (!totalErrorsError && totalErrorsLoaded) {
    totalErrorsRes.data.result.forEach((item) => {
      const gatewayName = `${item.metric.source_workload_namespace}/${item.metric.source_workload}`;
      getGateway(gatewayName).errors = parseFloat(item.value[1]);
    });
  }
  if (!totalErrorsByCodeError && totalErrorsByCodeLoaded) {
    totalErrorsByCodeRes.data.result.forEach((item) => {
      const gatewayName = `${item.metric.source_workload_namespace}/${item.metric.source_workload}`;
      const gateway = getGateway(gatewayName);
      if (!gateway.codes) gateway.codes = {};
      gateway.codes[item.metric.response_code] = parseFloat(item.value[1]);
    });
  }

  const loaded = totalRequestsLoaded && totalErrorsLoaded && totalErrorsByCodeLoaded;
  const error = !!(totalRequestsError || totalErrorsError || totalErrorsByCodeError);

  return { metrics, loaded, error };
};

// helper functions to extract metric values given a gateway object
export const getTotalRequests = (
  metrics: GatewayMetricsMap,
  obj: { metadata: { namespace: string; name: string } },
): number => {
  const key = `${obj.metadata.namespace}/${obj.metadata.name}-istio`;
  const total = metrics[key]?.total;
  return Number.isFinite(total) ? Math.round(total) : 0;
};

export const getSuccessfulRequests = (
  metrics: GatewayMetricsMap,
  obj: { metadata: { namespace: string; name: string } },
): number => {
  const key = `${obj.metadata.namespace}/${obj.metadata.name}-istio`;
  const success = metrics[key]?.total - metrics[key]?.errors;
  return Number.isFinite(success) ? Math.round(success) : 0;
};

export const getErrorRate = (
  metrics: GatewayMetricsMap,
  obj: { metadata: { namespace: string; name: string } },
): string => {
  const key = `${obj.metadata.namespace}/${obj.metadata.name}-istio`;
  const rate = (metrics[key]?.errors / metrics[key]?.total) * 100;
  return Number.isFinite(rate) ? rate.toFixed(1) : '-';
};

export const getErrorCodes = (
  metrics: GatewayMetricsMap,
  obj: { metadata: { namespace: string; name: string } },
): Set<string> => {
  const codes = new Set<string>();
  const key = `${obj.metadata.namespace}/${obj.metadata.name}-istio`;
  if (metrics[key]?.codes) {
    Object.entries(metrics[key].codes).forEach(([code, value]) => {
      if (code.startsWith('4') && value > 0) {
        codes.add('4xx');
      } else if (code.startsWith('5') && value > 0) {
        codes.add('5xx');
      }
    });
  }
  return codes;
};

export const getErrorCodeDistribution = (
  metrics: GatewayMetricsMap,
  obj: { metadata: { namespace: string; name: string } },
  prefix: string,
): Array<[string, { total: number; percent: number }]> => {
  const key = `${obj.metadata.namespace}/${obj.metadata.name}-istio`;
  const codes = metrics[key]?.codes ?? {};
  const filteredCodes = Object.entries(codes).filter(([code]) => code.startsWith(prefix));

  const total = filteredCodes.reduce((sum, [, count]) => sum + count, 0);

  const distribution: Array<[string, { total: number; percent: number }]> = [];
  filteredCodes.forEach(([code, count]) => {
    if (count < 1) return;
    distribution.push([
      code,
      {
        total: count,
        percent: total > 0 ? (count / total) * 100 : 0,
      },
    ]);
  });

  return distribution.sort(([, a], [, b]) => Number(b.total) - Number(a.total));
};
