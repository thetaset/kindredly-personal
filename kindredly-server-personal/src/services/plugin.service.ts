import { SitePluginRepo } from '@/db/site_plugin.repo';
import { UserRepo } from '@/db/user.repo';
import { getDefaultPattern } from 'tset-sharedlib/text.utils';
import { RequestContext } from '../base/request_context';

class PluginService {
  private users = new UserRepo();

  private sitePlugins = new SitePluginRepo();


  async initialize() {
    console.log('Initializing Plugins');
    await this.loadDefaults();
  }

  async loadPluginNoDistractions() {
    const css = {
      css: `#comments,#center,#secondary,ytd-banner-promo-renderer-background,.ytp-endscreen-content,#related
            {
            display:none !important;
            }`,
    };

    const script = {};

    const pluginId = 'default-youtube-no-distractions';

    await this._addSitePlugin(
      pluginId,
      'youtube.com',
      'Youtube - no distractions',
      ['focus', 'simple'],
      'Youtube - No Comments, No recommendations, No Search, (Does not block ads)',
      [getDefaultPattern('youtube.com')],
      css,
      script,
      '0.1',
    );
    console.log('Adding plugin: ', pluginId);
  }

  async loadDefaults() {
    await this.loadPluginNoDistractions();
  }


  async getSitePluginById(id) {
    return await this.sitePlugins.findById(id);
  }

  // ROUTE-METHOD
  async listSitePlugins() {
    return await this.sitePlugins.findAll();
  }

  // ROUTE-METHOD
  async listSitePluginsByIds(ids) {
    return await this.sitePlugins.findWhereIdIn(ids);
  }

  // ROUTE-METHOD
  async setUserPlugins(ctx: RequestContext, userId, pluginIds) {
    await ctx.verifyAdminPermissions(userId);
    await this.users.updateWithId(userId, { plugins: pluginIds });
  }

  async _addSitePlugin(id, key, name, tags, description, patterns, css, script, version) {
    const info = {
      _id: id,
      key: key,
      name: name,
      description: description,
      tags: tags,
      patterns: patterns,
      css: css,
      script: script,
      version: version,
    };

    await this.sitePlugins.create(info);

    return id;
  }
}

export default PluginService;
