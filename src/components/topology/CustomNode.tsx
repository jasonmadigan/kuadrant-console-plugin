import * as React from 'react';
import { DefaultNode } from '@patternfly/react-topology';
import { CubesIcon, CloudUploadAltIcon, TopologyIcon, RouteIcon } from '@patternfly/react-icons';

interface CustomNodeProps {
  element: any;
  onSelect?: () => void;
  selected?: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
  contextMenuOpen?: boolean;
}

// Disable the context menu for these 'meta-kinds'
const DISABLED_CONTEXT_MENU_TYPES = ['GatewayClass', 'HTTPRouteRule', 'Listener'];

const getIconComponent = (type: string) => {
  switch (type) {
    case 'Gateway':
      return CubesIcon;
    case 'HTTPRoute':
      return RouteIcon;
    case 'TLSPolicy':
    case 'DNSPolicy':
      return CloudUploadAltIcon;
    case 'ConfigMap':
    case 'Listener':
      return TopologyIcon;
    case 'GatewayClass':
      return CubesIcon;
    case 'HttpRouteRule':
      return RouteIcon;
    default:
      return TopologyIcon;
  }
};

export const CustomNode: React.FC<CustomNodeProps> = ({
  element,
  onSelect,
  selected,
  onContextMenu,
  contextMenuOpen,
}) => {
  const data = element.getData();
  const { type, badge, badgeColor } = data;

  const isPolicyNode = ['TLSPolicy', 'DNSPolicy', 'AuthPolicy', 'RateLimitPolicy'].includes(type);
  const IconComponent = getIconComponent(type);

  const iconSize = 35;
  const paddingTop = 5;
  const paddingBottom = 15;
  const nodeHeight = element.getBounds().height;
  const nodeWidth = element.getBounds().width;

  return (
    <DefaultNode
      element={element}
      showStatusDecorator
      badge={badge}
      badgeColor={badgeColor}
      badgeTextColor="#fff"
      onSelect={onSelect}
      selected={selected}
      className={isPolicyNode ? 'policy-node' : ''}
      // Disable context menu for specified types
      onContextMenu={!DISABLED_CONTEXT_MENU_TYPES.includes(type) ? onContextMenu : undefined}
      contextMenuOpen={!DISABLED_CONTEXT_MENU_TYPES.includes(type) && contextMenuOpen}
    >
      <g transform={`translate(${nodeWidth / 2}, ${paddingTop})`}>
        <foreignObject width={iconSize} height={iconSize} x={-iconSize / 2}>
          <IconComponent
            className="kuadrant-topology-node-icon"
            style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
          />
        </foreignObject>
      </g>
      <g transform={`translate(${nodeWidth / 2}, ${nodeHeight - paddingBottom})`}>
        <text
          className="kuadrant-topology-type-text"
          style={{
            fontWeight: 'bold',
            fontSize: '12px',
            textAnchor: 'middle',
          }}
          dominantBaseline="central"
        >
          {type}
        </text>
      </g>
    </DefaultNode>
  );
};
