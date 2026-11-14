# 588 M1 - builds the Pascal scene as a native SketchUp model (SketchUp 2017+ / Ruby 2.2+).
#
# Start from an EMPTY model (each run adds a new "588 M1" group), then in Window > Ruby Console:
#   load 'C:/path/to/exports/sketchup/build.rb'
# Reads data.json and furniture.bin from the folder this file sits in. All lengths are inches.
require 'json'

module Pascal588
  FLAGS = Geom::PolygonMesh::AUTO_SOFTEN | Geom::PolygonMesh::SMOOTH_SOFT_EDGES unless const_defined?(:FLAGS)

  def self.pt(a)
    Geom::Point3d.new(a[0], a[1], a[2])
  end

  def self.vec(a)
    Geom::Vector3d.new(a[0], a[1], a[2])
  end

  def self.read_json(path)
    JSON.parse(File.open(path, 'rb') { |f| f.read }.force_encoding('UTF-8'))
  end

  # A planar loop with optional holes, pushed through `push` (nil = leave as a flat face).
  def self.add_faces(ents, spec)
    spec['faces'].each do |fs|
      face = ents.add_face(fs['outer'].map { |p| pt(p) })
      raise "could not make a face for #{spec['name']}" if face.nil?
      (fs['holes'] || []).each do |h|
        hole = ents.add_face(h.map { |p| pt(p) })
        hole.erase! unless hole.nil? # the inner face is the opening; erasing it leaves the hole
      end
      face = ents.grep(Sketchup::Face).max_by { |f| f.area } unless face.valid? # splitting can retire the first face
      next if spec['push'].nil?
      v = vec(spec['push'])
      face.pushpull(face.normal.dot(v) >= 0 ? v.length : -v.length)
    end
  end

  def self.shift_ends(ents, spec)
    return if spec['ends'].empty?
    o = pt(spec['o'])
    u = vec(spec['u'])
    p = vec(spec['push'])
    depth = p.length
    pu = Geom::Vector3d.new(p.x / depth, p.y / depth, p.z / depth)
    verts = []
    vecs = []
    ents.grep(Sketchup::Edge).map { |e| e.vertices }.flatten.uniq.each do |v|
      d = v.position - o
      next unless (d.dot(pu) - depth).abs < 0.01 # b plane only; the a plane keeps its ends
      spec['ends'].each do |e|
        next unless (d.dot(u) - e['x']).abs < 0.01
        verts << v
        vecs << Geom::Vector3d.new(u.x * e['dx'], u.y * e['dx'], u.z * e['dx'])
      end
    end
    ents.transform_by_vectors(verts, vecs) unless verts.empty?
  end

  def self.build_wall(parent, spec, mats, tag)
    g = parent.add_group
    g.name = spec['name']
    g.layer = tag
    add_faces(g.entities, spec)
    shift_ends(g.entities, spec)
    na = vec(spec['na'])
    g.entities.grep(Sketchup::Face).each do |f|
      d = f.normal.dot(na)
      m = d > 0.9 ? mats[spec['ma']] : (d < -0.9 ? mats[spec['mb']] : mats[spec['ma']])
      f.material = m
      f.back_material = m
    end
    g
  end

  def self.build_solid(parent, spec, mats, tag)
    g = parent.add_group
    g.name = spec['name']
    g.layer = tag
    add_faces(g.entities, spec)
    m = mats[spec['mat']]
    g.entities.grep(Sketchup::Face).each { |f| f.material = m; f.back_material = m }
    g
  end

  def self.build_node(parent, spec, mats, tag)
    case spec['t']
    when 'w' then build_wall(parent, spec, mats, tag)
    when 's' then build_solid(parent, spec, mats, tag)
    when 'g'
      g = parent.add_group
      g.name = spec['name']
      g.layer = tag
      spec['items'].each { |s| build_solid(g.entities, s, mats, tag) }
      g
    else raise "unknown element type #{spec['t']}"
    end
  end

  def self.build_definitions(model, data, mats, bin_path)
    defs = []
    File.open(bin_path, 'rb') do |bin|
      data['defs'].each_with_index do |d, i|
        art = data['artifacts'][d['art']]
        cd = model.definitions.add("#{d['name']} [#{i + 1}]")
        art['prims'].each_with_index do |p, k|
          bin.seek(p['po'])
          pos = bin.read(p['vc'] * 12).unpack('e*')
          bin.seek(p['io'])
          idx = bin.read(p['ic'] * 4).unpack('V*')
          mesh = Geom::PolygonMesh.new(p['vc'], p['ic'] / 3)
          pts = Array.new(p['vc']) { |v| mesh.add_point(Geom::Point3d.new(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2])) }
          (0...idx.length).step(3) do |t|
            a, b, c = pts[idx[t]], pts[idx[t + 1]], pts[idx[t + 2]]
            next if a == b || b == c || a == c # degenerate after welding
            mesh.add_polygon(a, b, c)
          end
          # fill_from_mesh needs an empty collection, so each extra material part gets its own group
          ents = k.zero? ? cd.entities : cd.entities.add_group.entities
          ents.fill_from_mesh(mesh, true, FLAGS, mats[d['mats'][k]])
        end
        defs << cd
      end
    end
    defs
  end

  def self.run(dir)
    t0 = Time.now
    data = read_json(File.join(dir, 'data.json'))
    model = Sketchup.active_model
    model.start_operation('Build 588 M1', true)
    begin
      mats = data['materials'].map do |m|
        mat = model.materials.add(m['name'])
        mat.color = Sketchup::Color.new(m['rgb'][0], m['rgb'][1], m['rgb'][2])
        mat.alpha = m['alpha']
        mat
      end
      tags = {}
      tag = lambda { |n| tags[n] ||= model.layers.add(n) }
      defs = build_definitions(model, data, mats, File.join(dir, 'furniture.bin'))

      top = model.entities.add_group
      top.name = data['name']
      n = Hash.new(0)
      if data['site']
        s = top.entities.add_group
        s.name = 'Site'
        s.layer = tag.call('Site')
        build_solid(s.entities, {'name' => 'Ground', 'mat' => data['site']['mat'], 'faces' => [{'outer' => data['site']['outer'], 'holes' => []}], 'push' => nil}, mats, tag.call('Site'))
      end
      data['levels'].each do |lv|
        lg = top.entities.add_group
        lg.name = lv['name']
        lg.layer = tag.call(lv['name'])
        lv['categories'].each do |cat, list|
          next if list.empty?
          cg = lg.entities.add_group
          cg.name = cat
          cg.layer = tag.call(cat)
          list.each do |e|
            if e['t'] == 'i'
              inst = cg.entities.add_instance(defs[e['def']], Geom::Transformation.new(e['xf']))
              inst.name = e['name']
              inst.layer = tag.call(cat)
            else
              build_node(cg.entities, e, mats, tag.call(cat))
            end
            n[cat] += 1
          end
        end
      end
      model.commit_operation
      puts "588 M1 built in #{(Time.now - t0).round(1)} s: " + n.map { |k, v| "#{k} #{v}" }.join(', ') + ", #{defs.length} component definitions, #{data['levels'].length} levels"
    rescue => e
      model.abort_operation
      raise "588 M1 build failed: #{e.message} (#{e.backtrace.first})"
    end
  end
end

Pascal588.run(File.dirname(__FILE__))
