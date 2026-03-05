export interface TargetRef {
  group: string;
  kind: 'HTTPRoute' | 'Gateway';
  name: string;
  sectionName?: string;
}
