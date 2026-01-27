import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Content,
  ContentVariants,
  Divider,
  Flex,
  FlexItem,
  Label,
  Popover,
  Progress,
  ProgressMeasureLocation,
} from '@patternfly/react-core';
import { GatewayMetricsMap, getErrorCodeDistribution } from '../../hooks/useGatewayMetrics';

interface ErrorCodeLabelProps {
  metrics: GatewayMetricsMap;
  obj: { metadata: { namespace: string; name: string } };
  codeGroup: string;
}

const ErrorCodeLabel: React.FC<ErrorCodeLabelProps> = ({ metrics, obj, codeGroup }) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [isOpen, setIsOpen] = React.useState(false);
  const distribution = getErrorCodeDistribution(metrics, obj, codeGroup[0]);
  let lastCode = '';

  return (
    <Popover
      className="custom-rounded-popover"
      headerContent={`Error Code`}
      bodyContent={
        <>
          <Content component={ContentVariants.p}>
            {t('Displays the distribution of error codes for request failures.')}
          </Content>
          <div className="popover-codes">
            {distribution.map(([code, dist]) => {
              lastCode = code;
              return (
                <div key={code} style={{ marginBottom: '8px' }}>
                  <Progress
                    value={dist.percent}
                    title={
                      <Flex
                        justifyContent={{ default: 'justifyContentSpaceBetween' }}
                        alignItems={{ default: 'alignItemsCenter' }}
                      >
                        <FlexItem>
                          <strong>Code: {code}</strong>
                        </FlexItem>
                        <FlexItem align={{ default: 'alignRight' }}>
                          {dist.total.toFixed(0) === '1'
                            ? '1 request'
                            : `${dist.total.toFixed(0)} requests`}
                        </FlexItem>
                      </Flex>
                    }
                    measureLocation={ProgressMeasureLocation.outside}
                  />
                  <Divider style={{ margin: '12px 0' }} />
                </div>
              );
            })}
          </div>
        </>
      }
      footerContent={
        <>
          <span>{t('Last 24h overview')}</span>
        </>
      }
      isVisible={isOpen}
      shouldClose={() => setIsOpen(false)}
      position="top"
    >
      <Label
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          marginRight: '0.5em',
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
        }}
      >
        &nbsp;{distribution.length === 1 ? lastCode : codeGroup}&nbsp;
      </Label>
    </Popover>
  );
};

export default ErrorCodeLabel;
