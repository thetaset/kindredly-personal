import { Knex } from "knex";
import { DefaultCategories } from "../../../tset-sharedlib/dist/constants";

export async function up(knex: Knex): Promise<void> {
  // 1. Update sysinfo table with new category structure
  const categoryNames = DefaultCategories.map(cat => cat.name);
  
  await knex('sys_info')
    .insert({
      _id: 'cats',
      data: JSON.stringify({ items: categoryNames })
    })
    .onConflict('_id')
    .merge({
      data: JSON.stringify({ items: categoryNames })
    });

  // 2. Update published table - convert any old category references to new format
  // This handles cases where categories might be stored differently in the published table
  const publishedItems = await knex('published').select('_id', 'categories');
  
  for (const item of publishedItems) {
    if (item.categories) {
      let updatedCategories = item.categories;
      let needsUpdate = false;

      // If categories is an array of strings, convert to new structure
      if (Array.isArray(item.categories)) {
        updatedCategories = {
          items: item.categories.map((catName: string) => {
            const found = DefaultCategories.find(cat => cat.name === catName);
            return found ? found.id : catName; // Use ID if found, otherwise keep original name
          })
        };
        needsUpdate = true;
      }
      // If categories has 'items' array, update the items to use IDs
      else if (item.categories.items && Array.isArray(item.categories.items)) {
        const updatedItems = item.categories.items.map((catName: string) => {
          const found = DefaultCategories.find(cat => cat.name === catName);
          return found ? found.id : catName; // Use ID if found, otherwise keep original name
        });
        if (JSON.stringify(updatedItems) !== JSON.stringify(item.categories.items)) {
          updatedCategories = { ...item.categories, items: updatedItems };
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await knex('published')
          .where('_id', item._id)
          .update({ 
            categories: JSON.stringify(updatedCategories)
          });
      }
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Revert sysinfo table to previous state (remove cats entry)
  await knex('sys_info').where('_id', 'cats').del();
  
  // For published items, we could revert category IDs back to names, but this might be destructive
  // Since we don't know the original state, we'll leave published items as-is
  // In a real scenario, you might want to store the original state first
  console.log('Warning: Published table category changes are not reverted to avoid data loss');
}