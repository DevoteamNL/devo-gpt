import { PluginDisplayNameT } from '../../plugin/plugin.constants';

export class User {
  id: number;
  providerId: string;
  username: string;
  name?: string;
  plugins?: PluginDisplayNameT[];
  created_at: Date;
  updated_at: Date;
}
