import * as React from 'react';
import {
  Toolbar,
  ToolbarContent,
  ToolbarFilter,
  ToolbarItem,
  Badge,
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';

interface ResourceFilterToolbarProps {
  allResourceTypes: string[];
  selectedResourceTypes: string[];
  onResourceSelect: (
    event: React.MouseEvent | React.ChangeEvent | undefined,
    selection: string,
  ) => void;
  onDeleteResourceFilter: (category: string, chip: string) => void;
  onDeleteResourceGroup: () => void;
  clearAllFilters: () => void;
}

export const ResourceFilterToolbar: React.FC<ResourceFilterToolbarProps> = ({
  allResourceTypes,
  selectedResourceTypes,
  onResourceSelect,
  onDeleteResourceFilter,
  onDeleteResourceGroup,
  clearAllFilters,
}) => {
  const { t } = useTranslation('plugin__kuadrant-console-plugin');
  const [isResourceFilterOpen, setIsResourceFilterOpen] = React.useState(false);

  return (
    <Toolbar
      id="resource-filter-toolbar"
      className="pf-m-toggle-group-container"
      collapseListedFiltersBreakpoint="xl"
      clearAllFilters={clearAllFilters}
      clearFiltersButtonText={t('Reset Filters')}
    >
      <ToolbarContent>
        <ToolbarItem variant="label-group">
          <ToolbarFilter
            categoryName="Resource"
            labels={selectedResourceTypes}
            deleteLabel={onDeleteResourceFilter}
            deleteLabelGroup={onDeleteResourceGroup}
          >
            <Select
              aria-label="Resource filter"
              role="menu"
              isOpen={isResourceFilterOpen}
              onOpenChange={(isOpen) => setIsResourceFilterOpen(isOpen)}
              onSelect={onResourceSelect}
              selected={selectedResourceTypes}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsResourceFilterOpen(!isResourceFilterOpen)}
                  isExpanded={isResourceFilterOpen}
                >
                  Resource{' '}
                  {selectedResourceTypes.length > 0 && (
                    <Badge isRead>{selectedResourceTypes.length}</Badge>
                  )}
                </MenuToggle>
              )}
            >
              <SelectList>
                {allResourceTypes.map((type) => (
                  <SelectOption
                    key={type}
                    value={type}
                    hasCheckbox
                    isSelected={selectedResourceTypes.includes(type)}
                  >
                    {type}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </ToolbarFilter>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};
