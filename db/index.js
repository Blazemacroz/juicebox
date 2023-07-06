const { Client } = require('pg');

const client = new Client({
    host: "localhost",
    port: 5432,
    database: "juicebox-dev",
    user: "postgres",
    password: "tolkien"
});

async function createUser({ username, password, name, location }) {
    try {
      const { rows } = await client.query(`
        INSERT INTO users(username, password, name, location)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (username) DO NOTHING
        RETURNING *;
      `, [username, password, name, location]);
  
      return rows;
    } catch (error) {
      throw error;
    }
  }

  async function updateUser(id, fields = {}) {
    const setString = Object.keys(fields).map(
      (key) => `"${ key }"='${ fields[key] }'`
    ).join(', ');
    
    if (setString.length === 0) {
      return;
    }
  
    try {
      const { rows: [ user ] } = await client.query(`
        UPDATE users
        SET ${ setString }
        WHERE id=${id}
        RETURNING *;
      `, []);
  
      return user;
    } catch (error) {
      throw error;
    }
  }

async function getAllUsers () {
    const { rows } = await client.query(
        `SELECT id, username, name, location, active
        
        FROM users;
        `
    );

    return rows;
}

async function createPost ({authorId, title, content}) {
    try {
        const { rows } = await client.query(`
        INSERT INTO posts("authorId", title, content)
        VALUES ($1, $2, $3)
        RETURNING *;
      `, [authorId, title, content]);
  
      return rows;
    } catch (error) {
        throw error;
    }
}

async function updatePost(id, fields = {}) {
    const setString = Object.keys(fields).map(
        (key) => `"${ key }"='${ fields[key] }'`
      ).join(', ');
      
      if (setString.length === 0) {
        return;
      }
    try {
        const { rows: [ post ] } = await client.query(`
        UPDATE posts
        SET ${ setString }
        WHERE id=${id}
        RETURNING *;
      `, []);
  
      return post;
    } catch (error) {
      throw error;
    }
  }

  async function getAllPosts() {
    try {
        const { rows } = await client.query(
            `SELECT "authorId", title, content
            
            FROM posts;
            `)

            return rows
    } catch (error) {
      throw error;
    }
  }

  async function getPostsByUser(userId) {
    try {
      const { rows: [user] } = await client.query(`
        SELECT * FROM posts
        WHERE "authorId"=$1;
      `, [userId]);
        delete user.password 
      return rows;
    } catch (error) {
      throw error;
    }
  }

  async function getUserById(userId) {
    try {
      const { rows: [user] } = await client.query(`
        SELECT * FROM posts
        WHERE "userId"=$1;
      `);
      delete user.password
      const userPosts = await getPostsByUser(userId)

      user.posts = userPosts;

      return user;
    } catch (error) {
      throw error;
    }
  };

  async function createTags(tagList) {
    if (tagList.length === 0) { 
      return; 
    }
  
    // need something like: $1), ($2), ($3 
    const insertValues = tagList.map(
      (_, index) => `$${ index + 1 }`).join("), (");
    // then we can use: (${ insertValues }) in our string template
  
    // need something like $1, $2, $3
    const selectValues = tagList.map(
      (_, index) => `$${ index + 1 }`).join(", ");
    // then we can use (${ selectValues }) in our string template
  
    try {
      await client.query(`
      INSERT INTO tags(name)
      VALUES(${insertValues})
      ON CONFLICT (name) DO NOTHING
      `, tagList
      );
      const {rows: tags} = await client.query(`
      SELECT * FROM tags
      WHERE name IN (${selectValues});
      `, tagList)
      return tags;
    } catch (error) {
      throw error;
    }
  }

  async function addTagsToPost(postId, tagList) {
    try {
      const createPostTagPromises = tagList.map(
        tag => createPostTag(postId, tag.id)
      );
  
      await Promise.all(createPostTagPromises);
  
      return await getPostById(postId);
    } catch (error) {
      throw error;
    }
  }

  async function createPostTag(postId, tagId) {
    try {
      await client.query(`
        INSERT INTO post_tags("postId", "tagId")
        VALUES ($1, $2)
        ON CONFLICT ("postId", "tagId") DO NOTHING;
      `, [postId, tagId]);
    } catch (error) {
      throw error;
    }
  }

  async function getPostById(postId) {
    try {
      const { rows: [ post ]  } = await client.query(`
        SELECT *
        FROM posts
        WHERE id=$1;
      `, [postId]);
  
      const { rows: tags } = await client.query(`
        SELECT tags.*
        FROM tags
        JOIN post_tags ON tags.id=post_tags."tagId"
        WHERE post_tags."postId"=$1;
      `, [postId])
  
      const { rows: [author] } = await client.query(`
        SELECT id, username, name, location
        FROM users
        WHERE id=$1;
      `, [post])
  
      post.tags = tags;
      post.author = author;
  
      delete post.authorId;
  
      return post;
    } catch (error) {
      throw error;
    }
  }

module.exports = {
    client,
    getAllUsers,
    createUser,
    updateUser,
    createPost,
    updatePost,
    getAllPosts,
    getPostsByUser,
    getUserById,
    createTags,
    addTagsToPost,
  }