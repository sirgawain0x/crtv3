import{u as I,v as O}from"../chunk-JSQ47LU7.js";import{i as C}from"../chunk-MPW3RCU6.js";C();var F=5,M=async(o,$)=>{let m=new Set,L={async query(e,d,a){let u;typeof e!="string"&&(u=e.signal,d=e.params,a=e.callback,e=e.query);let l=a?[a]:[],n=I().replace(/-/g,""),t=!1,f,R,g=async()=>{await o.transaction(async r=>{let _=await O(o,e,d,r);await r.query(`CREATE OR REPLACE TEMP VIEW live_query_${n}_view AS ${_}`),R=await P(r,`live_query_${n}_view`),await D(r,R,m),await r.exec(`
            PREPARE live_query_${n}_get AS
            SELECT * FROM live_query_${n}_view;
          `),f=await r.query(`EXECUTE live_query_${n}_get;`)})};await g();let v=async(r=0)=>{if(l.length!==0){try{f=await o.query(`EXECUTE live_query_${n}_get;`)}catch(_){if(_.message===`prepared statement "live_query_${n}_get" does not exist`){if(r>F)throw _;await g(),v(r+1)}else throw _}N(l,f)}},S=await Promise.all(R.map(r=>o.listen(`table_change__${r.schema_name}__${r.table_name}`,async()=>{v()}))),h=r=>{if(t)throw new Error("Live query is no longer active and cannot be subscribed to");l.push(r)},p=async r=>{r?l=l.filter(_=>_!==_):l=[],l.length===0&&(t=!0,await Promise.all(S.map(_=>_())),await o.exec(`
            DROP VIEW IF EXISTS live_query_${n}_view;
            DEALLOCATE live_query_${n}_get;
          `))};return u?.aborted?await p():u?.addEventListener("abort",()=>{p()},{once:!0}),N(l,f),{initialResults:f,subscribe:h,unsubscribe:p,refresh:v}},async changes(e,d,a,u){let l;if(typeof e!="string"&&(l=e.signal,d=e.params,a=e.key,u=e.callback,e=e.query),!a)throw new Error("key is required for changes queries");let n=u?[u]:[],t=I().replace(/-/g,""),f=!1,R,g=1,v,S=async()=>{await o.transaction(async i=>{let T=await O(o,e,d,i);await i.query(`CREATE OR REPLACE TEMP VIEW live_query_${t}_view AS ${T}`),R=await P(i,`live_query_${t}_view`),await D(i,R,m);let c=[...(await i.query(`
                SELECT column_name, data_type, udt_name
                FROM information_schema.columns 
                WHERE table_name = 'live_query_${t}_view'
              `)).rows,{column_name:"__after__",data_type:"integer"}];await i.exec(`
            CREATE TEMP TABLE live_query_${t}_state1 (LIKE live_query_${t}_view INCLUDING ALL);
            CREATE TEMP TABLE live_query_${t}_state2 (LIKE live_query_${t}_view INCLUDING ALL);
          `);for(let A of[1,2]){let E=A===1?2:1;await i.exec(`
              PREPARE live_query_${t}_diff${A} AS
              WITH
                prev AS (SELECT LAG("${a}") OVER () as __after__, * FROM live_query_${t}_state${E}),
                curr AS (SELECT LAG("${a}") OVER () as __after__, * FROM live_query_${t}_state${A}),
                data_diff AS (
                  -- INSERT operations: Include all columns
                  SELECT 
                    'INSERT' AS __op__,
                    ${c.map(({column_name:s})=>`curr."${s}" AS "${s}"`).join(`,
`)},
                    ARRAY[]::text[] AS __changed_columns__
                  FROM curr
                  LEFT JOIN prev ON curr.${a} = prev.${a}
                  WHERE prev.${a} IS NULL
                UNION ALL
                  -- DELETE operations: Include only the primary key
                  SELECT 
                    'DELETE' AS __op__,
                    ${c.map(({column_name:s,data_type:w,udt_name:b})=>s===a?`prev."${s}" AS "${s}"`:`NULL${w==="USER-DEFINED"?`::${b}`:""} AS "${s}"`).join(`,
`)},
                      ARRAY[]::text[] AS __changed_columns__
                  FROM prev
                  LEFT JOIN curr ON prev.${a} = curr.${a}
                  WHERE curr.${a} IS NULL
                UNION ALL
                  -- UPDATE operations: Include only changed columns
                  SELECT 
                    'UPDATE' AS __op__,
                    ${c.map(({column_name:s,data_type:w,udt_name:b})=>s===a?`curr."${s}" AS "${s}"`:`CASE 
                              WHEN curr."${s}" IS DISTINCT FROM prev."${s}" 
                              THEN curr."${s}"
                              ELSE NULL${w==="USER-DEFINED"?`::${b}`:""}
                              END AS "${s}"`).join(`,
`)},
                      ARRAY(SELECT unnest FROM unnest(ARRAY[${c.filter(({column_name:s})=>s!==a).map(({column_name:s})=>`CASE
                              WHEN curr."${s}" IS DISTINCT FROM prev."${s}" 
                              THEN '${s}' 
                              ELSE NULL 
                              END`).join(", ")}]) WHERE unnest IS NOT NULL) AS __changed_columns__
                  FROM curr
                  INNER JOIN prev ON curr.${a} = prev.${a}
                  WHERE NOT (curr IS NOT DISTINCT FROM prev)
                )
              SELECT * FROM data_diff;
            `)}})};await S();let h=async()=>{if(n.length===0&&v)return;let i=!1;for(let T=0;T<5;T++)try{await o.transaction(async c=>{await c.exec(`
                INSERT INTO live_query_${t}_state${g} 
                  SELECT * FROM live_query_${t}_view;
              `),v=await c.query(`EXECUTE live_query_${t}_diff${g};`),g=g===1?2:1,await c.exec(`
                TRUNCATE live_query_${t}_state${g};
              `)});break}catch(c){if(c.message===`relation "live_query_${t}_state${g}" does not exist`){i=!0,await S();continue}else throw c}q(n,[...i?[{__op__:"RESET"}]:[],...v.rows])},p=await Promise.all(R.map(i=>o.listen(`table_change__${i.schema_name}__${i.table_name}`,async()=>h()))),r=i=>{if(f)throw new Error("Live query is no longer active and cannot be subscribed to");n.push(i)},_=async i=>{i?n=n.filter(T=>T!==T):n=[],n.length===0&&(f=!0,await Promise.all(p.map(T=>T())),await o.exec(`
            DROP VIEW IF EXISTS live_query_${t}_view;
            DROP TABLE IF EXISTS live_query_${t}_state1;
            DROP TABLE IF EXISTS live_query_${t}_state2;
            DEALLOCATE live_query_${t}_diff1;
            DEALLOCATE live_query_${t}_diff2;
          `))};return l?.aborted?await _():l?.addEventListener("abort",()=>{_()},{once:!0}),await h(),{fields:v.fields.filter(i=>!["__after__","__op__","__changed_columns__"].includes(i.name)),initialChanges:v.rows,subscribe:r,unsubscribe:_,refresh:h}},async incrementalQuery(e,d,a,u){let l;if(typeof e!="string"&&(l=e.signal,d=e.params,a=e.key,u=e.callback,e=e.query),!a)throw new Error("key is required for incremental queries");let n=u?[u]:[],t=new Map,f=new Map,R=[],g=!0,{fields:v,unsubscribe:S,refresh:h}=await L.changes(e,d,a,_=>{for(let T of _){let{__op__:c,__changed_columns__:A,...E}=T;switch(c){case"RESET":t.clear(),f.clear();break;case"INSERT":t.set(E[a],E),f.set(E.__after__,E[a]);break;case"DELETE":{let s=t.get(E[a]);t.delete(E[a]),s.__after__!==null&&f.delete(s.__after__);break}case"UPDATE":{let s={...t.get(E[a])??{}};for(let w of A)s[w]=E[w],w==="__after__"&&f.set(E.__after__,E[a]);t.set(E[a],s);break}}}let y=[],i=null;for(let T=0;T<t.size;T++){let c=f.get(i),A=t.get(c);if(!A)break;let E={...A};delete E.__after__,y.push(E),i=c}R=y,g||N(n,{rows:y,fields:v})});g=!1,N(n,{rows:R,fields:v});let p=_=>{n.push(_)},r=async _=>{_?n=n.filter(y=>y!==y):n=[],n.length===0&&await S()};return l?.aborted?await r():l?.addEventListener("abort",()=>{r()},{once:!0}),{initialResults:{rows:R,fields:v},subscribe:p,unsubscribe:r,refresh:h}}};return{namespaceObj:L}},j={name:"Live Queries",setup:M};async function P(o,$){let m=new Map;async function L(e){let d=await o.query(`
        SELECT DISTINCT
          cl.relname AS table_name,
          n.nspname AS schema_name,
          cl.relkind = 'v' AS is_view
        FROM pg_rewrite r
        JOIN pg_depend d ON r.oid = d.objid
        JOIN pg_class cl ON d.refobjid = cl.oid
        JOIN pg_namespace n ON cl.relnamespace = n.oid
        WHERE
        r.ev_class = (
            SELECT oid FROM pg_class WHERE relname = $1 AND relkind = 'v'
        )
        AND d.deptype = 'n';
      `,[e]);for(let a of d.rows)if(a.table_name!==e&&!a.is_view){let u=`"${a.schema_name}"."${a.table_name}"`;m.has(u)||m.set(u,{table_name:a.table_name,schema_name:a.schema_name})}else a.is_view&&await L(a.table_name)}return await L($),Array.from(m.values())}async function D(o,$,m){let L=$.filter(e=>!m.has(`${e.schema_name}_${e.table_name}`)).map(e=>`
      CREATE OR REPLACE FUNCTION "_notify_${e.schema_name}_${e.table_name}"() RETURNS TRIGGER AS $$
      BEGIN
        PERFORM pg_notify('table_change__${e.schema_name}__${e.table_name}', '');
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
      CREATE OR REPLACE TRIGGER "_notify_trigger_${e.schema_name}_${e.table_name}"
      AFTER INSERT OR UPDATE OR DELETE ON "${e.schema_name}"."${e.table_name}"
      FOR EACH STATEMENT EXECUTE FUNCTION "_notify_${e.schema_name}_${e.table_name}"();
      `).join(`
`);L.trim()!==""&&await o.exec(L),$.map(e=>m.add(`${e.schema_name}_${e.table_name}`))}var N=(o,$)=>{for(let m of o)m($)},q=(o,$)=>{for(let m of o)m($)};export{j as live};
//# sourceMappingURL=index.js.map